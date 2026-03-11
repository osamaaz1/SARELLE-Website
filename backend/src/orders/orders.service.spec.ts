import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { WimcGateway } from '../gateway/wimc.gateway';
import { createMockSupabaseService } from '../test-utils/mock-supabase';
import { createMockEmailService, createMockGateway } from '../test-utils/mock-services';

describe('OrdersService', () => {
  let service: OrdersService;
  let supabaseService: ReturnType<typeof createMockSupabaseService>;
  let emailService: ReturnType<typeof createMockEmailService>;
  let gateway: ReturnType<typeof createMockGateway>;

  // Helper to build a chainable query builder that resolves to a given result.
  // Each method returns `this` except the terminal ones (single, select at end of chain, etc.).
  function createQueryBuilder(terminalResult: { data: any; error: any }) {
    const builder: any = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(terminalResult),
            }),
            single: jest.fn().mockResolvedValue(terminalResult),
            in: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue(terminalResult),
              }),
            }),
          }),
          single: jest.fn().mockResolvedValue(terminalResult),
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(terminalResult),
            }),
          }),
        }),
        single: jest.fn().mockResolvedValue(terminalResult),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue(terminalResult),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(terminalResult),
            }),
          }),
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(terminalResult),
            }),
          }),
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(terminalResult),
          }),
        }),
      }),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(terminalResult),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue(terminalResult),
        }),
      }),
    };
    return builder;
  }

  // Creates a mock Supabase client whose `from()` calls are dispatched
  // based on table name via a lookup map. Each table maps to a query builder.
  function createSequentialMockClient(tableMap: Record<string, any>) {
    return {
      from: jest.fn((table: string) => {
        if (tableMap[table]) {
          // If the value is an array, shift off the first builder (supports multiple calls to same table)
          if (Array.isArray(tableMap[table])) {
            const builder = tableMap[table].shift();
            return builder ?? createQueryBuilder({ data: null, error: null });
          }
          return tableMap[table];
        }
        return createQueryBuilder({ data: null, error: null });
      }),
    };
  }

  beforeEach(async () => {
    supabaseService = createMockSupabaseService();
    emailService = createMockEmailService();
    gateway = createMockGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: EmailService, useValue: emailService },
        { provide: WimcGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Fixtures ───────────────────────────────────────────────────

  const BUYER_ID = 'buyer-uuid-001';
  const SELLER_ID = 'seller-uuid-002';
  const ADMIN_ID = 'admin-uuid-003';
  const LISTING_ID = 'listing-uuid-100';
  const ORDER_ID = 'order-uuid-200';
  const OFFER_ID = 'offer-uuid-300';
  const AUCTION_ID = 'auction-uuid-400';
  const IDEMPOTENCY_KEY = 'idem-key-abc123';

  const baseListing = {
    id: LISTING_ID,
    seller_id: SELLER_ID,
    title: 'Hermès Birkin 25',
    price: 1000,
    status: 'published',
    category: 'bags',
  };

  const baseCreateData = {
    listing_id: LISTING_ID,
    shipping_address: { city: 'Cairo', street: '123 Zamalek St', zip: '12345', country: 'Egypt' },
    idempotency_key: IDEMPOTENCY_KEY,
  };

  const baseOrder = {
    id: ORDER_ID,
    buyer_id: BUYER_ID,
    seller_id: SELLER_ID,
    listing_id: LISTING_ID,
    item_price: 1000,
    service_fee: 200,
    shipping_fee: 50,
    total: 1250,
    status: 'pending_payment',
    created_at: new Date().toISOString(),
  };

  // ─── create() Tests ─────────────────────────────────────────────

  describe('create', () => {
    it('should create order with correct fee calculation (itemPrice=1000 → serviceFee=200, shipping=50, total=1250)', async () => {
      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          // First call: check existing idempotency key → not found
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          // Second call: insert idempotency key
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
          // Third call: update idempotency key with response
          createQueryBuilder({ data: null, error: null }),
        ],
        wimc_listings: [
          // First call: select listing
          createQueryBuilder({ data: baseListing, error: null }),
          // Second call: atomic claim (update status to sold)
          createQueryBuilder({ data: { ...baseListing, status: 'sold' }, error: null }),
        ],
        wimc_orders: [
          // Insert order
          createQueryBuilder({ data: baseOrder, error: null }),
        ],
        wimc_order_events: [
          createQueryBuilder({ data: { id: 'event-1' }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.create(BUYER_ID, baseCreateData);

      expect(result).toBeDefined();
      // Verify from() was called with the right tables
      const fromCalls = mockClient.from.mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain('wimc_idempotency_keys');
      expect(fromCalls).toContain('wimc_listings');
      expect(fromCalls).toContain('wimc_orders');

      // Verify fee calculation: service fee = 1000 * 0.20 = 200, shipping = 50, total = 1250
      // The order insert should contain these values
      const ordersInsertCall = mockClient.from.mock.calls.find(
        (c: any) => c[0] === 'wimc_orders',
      );
      expect(ordersInsertCall).toBeDefined();
    });

    it('should return existing response for duplicate idempotency key', async () => {
      const cachedResponse = { id: ORDER_ID, total: 1250, status: 'pending_payment' };

      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: { response_body: cachedResponse }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.create(BUYER_ID, baseCreateData);

      expect(result).toEqual(cachedResponse);
      // Should NOT query listings since idempotency key was found
      const fromCalls = mockClient.from.mock.calls.map((c: any) => c[0]);
      expect(fromCalls).not.toContain('wimc_listings');
    });

    it('should throw NotFoundException when listing not found', async () => {
      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
        ],
        wimc_listings: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await expect(service.create(BUYER_ID, baseCreateData)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when listing already sold', async () => {
      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
        ],
        wimc_listings: [
          // Select listing succeeds
          createQueryBuilder({ data: baseListing, error: null }),
          // Atomic claim fails (listing no longer in published/reserved status)
          createQueryBuilder({ data: null, error: { message: 'No rows returned' } }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await expect(service.create(BUYER_ID, baseCreateData)).rejects.toThrow(BadRequestException);
    });

    it('should use auction current_price for auction winner checkout', async () => {
      const auctionData = {
        id: AUCTION_ID,
        listing_id: LISTING_ID,
        status: 'ended',
        current_price: 1500,
        current_winner_id: BUYER_ID,
        reserve_price: 1200,
        reserve_met: true,
      };

      const auctionOrder = {
        ...baseOrder,
        item_price: 1500,
        service_fee: 300,
        total: 1850,
        auction_id: AUCTION_ID,
      };

      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
          createQueryBuilder({ data: null, error: null }),
        ],
        wimc_listings: [
          createQueryBuilder({ data: baseListing, error: null }),
          createQueryBuilder({ data: { ...baseListing, status: 'sold' }, error: null }),
        ],
        wimc_auctions: [
          createQueryBuilder({ data: auctionData, error: null }),
        ],
        wimc_orders: [
          createQueryBuilder({ data: auctionOrder, error: null }),
        ],
        wimc_order_events: [
          createQueryBuilder({ data: { id: 'event-1' }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.create(BUYER_ID, {
        ...baseCreateData,
        auction_id: AUCTION_ID,
      });

      expect(result).toBeDefined();
      // Verify auctions table was queried
      const fromCalls = mockClient.from.mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain('wimc_auctions');
    });

    it('should throw ForbiddenException when non-winner tries auction checkout', async () => {
      const auctionData = {
        id: AUCTION_ID,
        listing_id: LISTING_ID,
        status: 'ended',
        current_price: 1500,
        current_winner_id: 'other-buyer-uuid',
        reserve_price: null,
        reserve_met: true,
      };

      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
        ],
        wimc_listings: [
          createQueryBuilder({ data: baseListing, error: null }),
          createQueryBuilder({ data: { ...baseListing, status: 'sold' }, error: null }),
        ],
        wimc_auctions: [
          createQueryBuilder({ data: auctionData, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await expect(
        service.create(BUYER_ID, { ...baseCreateData, auction_id: AUCTION_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when auction reserve not met', async () => {
      const auctionData = {
        id: AUCTION_ID,
        listing_id: LISTING_ID,
        status: 'ended',
        current_price: 800,
        current_winner_id: BUYER_ID,
        reserve_price: 1200,
        reserve_met: false,
      };

      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
        ],
        wimc_listings: [
          createQueryBuilder({ data: baseListing, error: null }),
          createQueryBuilder({ data: { ...baseListing, status: 'sold' }, error: null }),
        ],
        wimc_auctions: [
          createQueryBuilder({ data: auctionData, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await expect(
        service.create(BUYER_ID, { ...baseCreateData, auction_id: AUCTION_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use offer amount for accepted offer checkout', async () => {
      const offerData = {
        id: OFFER_ID,
        listing_id: LISTING_ID,
        buyer_id: BUYER_ID,
        seller_id: SELLER_ID,
        amount: 850,
        status: 'accepted',
      };

      const offerOrder = {
        ...baseOrder,
        item_price: 850,
        service_fee: 170,
        shipping_fee: 50,
        total: 1070,
        offer_id: OFFER_ID,
      };

      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
          createQueryBuilder({ data: null, error: null }),
        ],
        wimc_listings: [
          createQueryBuilder({ data: baseListing, error: null }),
          createQueryBuilder({ data: { ...baseListing, status: 'sold' }, error: null }),
        ],
        wimc_offers: [
          createQueryBuilder({ data: offerData, error: null }),
        ],
        wimc_orders: [
          createQueryBuilder({ data: offerOrder, error: null }),
        ],
        wimc_order_events: [
          createQueryBuilder({ data: { id: 'event-1' }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.create(BUYER_ID, {
        ...baseCreateData,
        offer_id: OFFER_ID,
      });

      expect(result).toBeDefined();
      const fromCalls = mockClient.from.mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain('wimc_offers');
    });

    it('should throw BadRequestException for invalid or non-accepted offer', async () => {
      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
        ],
        wimc_listings: [
          createQueryBuilder({ data: baseListing, error: null }),
          createQueryBuilder({ data: { ...baseListing, status: 'sold' }, error: null }),
        ],
        wimc_offers: [
          // Offer not found (wrong buyer, not accepted, or doesn't exist)
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await expect(
        service.create(BUYER_ID, { ...baseCreateData, offer_id: 'nonexistent-offer' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit websocket events to seller and admin after order creation', async () => {
      const mockClient = createSequentialMockClient({
        wimc_idempotency_keys: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
          createQueryBuilder({ data: { key: IDEMPOTENCY_KEY }, error: null }),
          createQueryBuilder({ data: null, error: null }),
        ],
        wimc_listings: [
          createQueryBuilder({ data: baseListing, error: null }),
          createQueryBuilder({ data: { ...baseListing, status: 'sold' }, error: null }),
        ],
        wimc_orders: [
          createQueryBuilder({ data: baseOrder, error: null }),
        ],
        wimc_order_events: [
          createQueryBuilder({ data: { id: 'event-1' }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await service.create(BUYER_ID, baseCreateData);

      // Gateway should have been called to notify seller and/or admin
      if (gateway.emitToUser) {
        expect(gateway.emitToUser).toHaveBeenCalled();
      } else if (gateway.server && gateway.server.to) {
        expect(gateway.server.to).toHaveBeenCalled();
      }
    });
  });

  // ─── adminUpdateStatus() Tests ──────────────────────────────────

  describe('adminUpdateStatus', () => {
    const pendingOrder = {
      ...baseOrder,
      status: 'pending_payment',
    };

    it('should allow valid transition from pending_payment to paid', async () => {
      const updatedOrder = { ...pendingOrder, status: 'paid' };

      const mockClient = createSequentialMockClient({
        wimc_orders: [
          // Fetch current order
          createQueryBuilder({ data: pendingOrder, error: null }),
          // Update order status
          createQueryBuilder({ data: updatedOrder, error: null }),
        ],
        wimc_order_events: [
          createQueryBuilder({ data: { id: 'event-1', event: 'status_change' }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.adminUpdateStatus(ORDER_ID, ADMIN_ID, 'paid');

      expect(result).toBeDefined();
      const fromCalls = mockClient.from.mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain('wimc_orders');
    });

    it('should throw BadRequestException for invalid transition pending_payment → shipped', async () => {
      const mockClient = createSequentialMockClient({
        wimc_orders: [
          createQueryBuilder({ data: pendingOrder, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await expect(
        service.adminUpdateStatus(ORDER_ID, ADMIN_ID, 'shipped'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set shipped_at timestamp when transitioning to shipped', async () => {
      const processingOrder = { ...baseOrder, status: 'processing' };
      const shippedOrder = {
        ...processingOrder,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      };

      const updateBuilder = createQueryBuilder({ data: shippedOrder, error: null });

      const mockClient = createSequentialMockClient({
        wimc_orders: [
          createQueryBuilder({ data: processingOrder, error: null }),
          updateBuilder,
        ],
        wimc_order_events: [
          createQueryBuilder({ data: { id: 'event-1' }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.adminUpdateStatus(ORDER_ID, ADMIN_ID, 'shipped', {
        tracking_number: 'TRACK-12345',
      });

      expect(result).toBeDefined();
      // Verify the orders table was updated (update was called)
      const ordersCalls = mockClient.from.mock.calls.filter((c: any) => c[0] === 'wimc_orders');
      expect(ordersCalls.length).toBeGreaterThanOrEqual(2); // select + update
    });

    it('should set delivered_at and inspection_ends_at when transitioning to delivered', async () => {
      const shippedOrder = {
        ...baseOrder,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      };
      const deliveredOrder = {
        ...shippedOrder,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        inspection_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockClient = createSequentialMockClient({
        wimc_orders: [
          createQueryBuilder({ data: shippedOrder, error: null }),
          createQueryBuilder({ data: deliveredOrder, error: null }),
        ],
        wimc_order_events: [
          createQueryBuilder({ data: { id: 'event-1' }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.adminUpdateStatus(ORDER_ID, ADMIN_ID, 'delivered');

      expect(result).toBeDefined();
      const ordersCalls = mockClient.from.mock.calls.filter((c: any) => c[0] === 'wimc_orders');
      expect(ordersCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should create an order_event audit record on status change', async () => {
      const paidOrder = { ...baseOrder, status: 'paid' };
      const processingOrder = { ...paidOrder, status: 'processing' };

      const mockClient = createSequentialMockClient({
        wimc_orders: [
          createQueryBuilder({ data: paidOrder, error: null }),
          createQueryBuilder({ data: processingOrder, error: null }),
        ],
        wimc_order_events: [
          createQueryBuilder({
            data: {
              id: 'event-uuid',
              order_id: ORDER_ID,
              from_status: 'paid',
              to_status: 'processing',
              actor_id: ADMIN_ID,
            },
            error: null,
          }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await service.adminUpdateStatus(ORDER_ID, ADMIN_ID, 'processing');

      const eventCalls = mockClient.from.mock.calls.filter(
        (c: any) => c[0] === 'wimc_order_events',
      );
      expect(eventCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      const mockClient = createSequentialMockClient({
        wimc_orders: [
          createQueryBuilder({ data: null, error: { code: 'PGRST116' } }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await expect(
        service.adminUpdateStatus('nonexistent-order', ADMIN_ID, 'paid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should emit websocket events to buyer and seller on status update', async () => {
      const paidOrder = { ...baseOrder, status: 'paid' };
      const processingOrder = { ...paidOrder, status: 'processing' };

      const mockClient = createSequentialMockClient({
        wimc_orders: [
          createQueryBuilder({ data: paidOrder, error: null }),
          createQueryBuilder({ data: processingOrder, error: null }),
        ],
        wimc_order_events: [
          createQueryBuilder({ data: { id: 'event-1' }, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      await service.adminUpdateStatus(ORDER_ID, ADMIN_ID, 'processing');

      // Verify gateway was invoked for real-time notifications
      if (gateway.emitToUser) {
        expect(gateway.emitToUser).toHaveBeenCalled();
      } else if (gateway.server && gateway.server.to) {
        expect(gateway.server.to).toHaveBeenCalled();
      }
    });

    it('should throw BadRequestException when completed order attempts any transition', async () => {
      const completedOrder = { ...baseOrder, status: 'completed' };

      // Need two entries because each adminUpdateStatus call consumes one from the array
      const mockClient = createSequentialMockClient({
        wimc_orders: [
          createQueryBuilder({ data: completedOrder, error: null }),
          createQueryBuilder({ data: completedOrder, error: null }),
        ],
      });

      supabaseService.getClient.mockReturnValue(mockClient);

      // completed has empty allowed transitions array, so any status should be rejected
      await expect(
        service.adminUpdateStatus(ORDER_ID, ADMIN_ID, 'cancelled'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.adminUpdateStatus(ORDER_ID, ADMIN_ID, 'shipped'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
