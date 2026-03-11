import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createMockSupabaseService } from '../test-utils/mock-supabase';

/**
 * Helper: creates a sequential mock Supabase client where each `.from(table)`
 * call returns the next query-builder in the provided array.  Every builder
 * defaults to resolving `{ data: null, error: null }` unless overridden.
 */
function buildSequentialClient(calls: Array<{ table: string; result: any; chainOverrides?: Record<string, any> }>) {
  const queue = [...calls];

  const client = {
    from: jest.fn().mockImplementation((table: string) => {
      const idx = queue.findIndex((c) => c.table === table);
      const entry = idx !== -1 ? queue.splice(idx, 1)[0] : undefined;
      const result = entry?.result ?? { data: null, error: null };

      const builder: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(result),
        maybeSingle: jest.fn().mockResolvedValue(result),
        then: (resolve: any) => Promise.resolve(result).then(resolve),
        ...entry?.chainOverrides,
      };

      return builder;
    }),
  };

  return client;
}

describe('PayoutsService', () => {
  let service: PayoutsService;
  let supabaseService: ReturnType<typeof createMockSupabaseService>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Commission rate calculations ─────────────────────────────────

  describe('trigger - commission calculations', () => {
    function buildTriggerClient(tier: string, itemPrice: number, expectedCommission: number, expectedPayout: number) {
      const orderId = `order-${tier}`;
      const sellerId = `seller-${tier}`;
      const now = new Date();
      const pastDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // 4 days ago

      return buildSequentialClient([
        // 1. check existing payout (idempotency) — none found
        {
          table: 'wimc_payouts',
          result: { data: null, error: null },
        },
        // 2. fetch order
        {
          table: 'wimc_orders',
          result: {
            data: {
              id: orderId,
              seller_id: sellerId,
              item_price: itemPrice,
              status: 'delivered',
              inspection_ends_at: pastDate.toISOString(),
            },
            error: null,
          },
        },
        // 3. fetch seller profile for tier (service uses wimc_profiles, not wimc_seller_profiles)
        {
          table: 'wimc_profiles',
          result: {
            data: { id: sellerId, tier },
            error: null,
          },
        },
        // 4. upsert payout
        {
          table: 'wimc_payouts',
          result: {
            data: {
              id: `payout-${tier}`,
              order_id: orderId,
              seller_id: sellerId,
              amount: expectedPayout,
              commission_rate: expectedCommission / itemPrice * 100,
              commission_amount: expectedCommission,
              status: 'pending',
            },
            error: null,
          },
        },
        // 5. insert payout event
        {
          table: 'wimc_payout_events',
          result: { data: { id: 'evt-1' }, error: null },
        },
        // 6. update order to completed
        {
          table: 'wimc_orders',
          result: { data: { id: orderId, status: 'completed' }, error: null },
        },
      ]);
    }

    it('should apply Bronze 20% commission (1000 → 200 commission, 800 payout)', async () => {
      const client = buildTriggerClient('Bronze', 1000, 200, 800);
      supabaseService.getClient.mockReturnValue(client);

      const result = await service.trigger('order-Bronze', 'admin-1');

      // Service returns payout directly (not wrapped in {data: ...})
      expect(result.commission_amount).toBe(200);
      expect(result.amount).toBe(800);
    });

    it('should apply Silver 18% commission (1000 → 180 commission, 820 payout)', async () => {
      const client = buildTriggerClient('Silver', 1000, 180, 820);
      supabaseService.getClient.mockReturnValue(client);

      const result = await service.trigger('order-Silver', 'admin-1');

      expect(result.commission_amount).toBe(180);
      expect(result.amount).toBe(820);
    });

    it('should apply Gold 15% commission (1000 → 150 commission, 850 payout)', async () => {
      const client = buildTriggerClient('Gold', 1000, 150, 850);
      supabaseService.getClient.mockReturnValue(client);

      const result = await service.trigger('order-Gold', 'admin-1');

      expect(result.commission_amount).toBe(150);
      expect(result.amount).toBe(850);
    });

    it('should apply Platinum 12% commission (1000 → 120 commission, 880 payout)', async () => {
      const client = buildTriggerClient('Platinum', 1000, 120, 880);
      supabaseService.getClient.mockReturnValue(client);

      const result = await service.trigger('order-Platinum', 'admin-1');

      expect(result.commission_amount).toBe(120);
      expect(result.amount).toBe(880);
    });
  });

  // ─── trigger edge cases ───────────────────────────────────────────

  describe('trigger - edge cases', () => {
    it('should return existing payout (idempotent) if one already exists for the order', async () => {
      const existingPayout = {
        id: 'payout-existing',
        order_id: 'order-dup',
        status: 'pending',
        amount: 800,
      };

      const client = buildSequentialClient([
        {
          table: 'wimc_payouts',
          result: { data: existingPayout, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      const result = await service.trigger('order-dup', 'admin-1');

      // Service returns existingPayout directly (idempotent return)
      expect(result.id).toBe('payout-existing');
      // Should not have proceeded to fetch order / create payout
      expect(client.from).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      const client = buildSequentialClient([
        // no existing payout
        {
          table: 'wimc_payouts',
          result: { data: null, error: null },
        },
        // order not found
        {
          table: 'wimc_orders',
          result: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await expect(service.trigger('order-missing', 'admin-1'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order status is not eligible (e.g. paid)', async () => {
      const client = buildSequentialClient([
        {
          table: 'wimc_payouts',
          result: { data: null, error: null },
        },
        {
          table: 'wimc_orders',
          result: {
            data: {
              id: 'order-ineligible',
              status: 'paid',
              seller_id: 'seller-1',
              item_price: 1000,
            },
            error: null,
          },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await expect(service.trigger('order-ineligible', 'admin-1'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException when inspection window has not ended', async () => {
      const futureInspection = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days from now

      const client = buildSequentialClient([
        {
          table: 'wimc_payouts',
          result: { data: null, error: null },
        },
        {
          table: 'wimc_orders',
          result: {
            data: {
              id: 'order-window',
              status: 'delivered',
              seller_id: 'seller-1',
              item_price: 1000,
              inspection_ends_at: futureInspection,
            },
            error: null,
          },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await expect(service.trigger('order-window', 'admin-1'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should set sent_at timestamp when status is sent', async () => {
      const payoutId = 'payout-send-1';

      const client = buildSequentialClient([
        // 1. read current status
        {
          table: 'wimc_payouts',
          result: {
            data: { id: payoutId, status: 'pending' },
            error: null,
          },
        },
        // 2. update payout
        {
          table: 'wimc_payouts',
          result: {
            data: {
              id: payoutId,
              status: 'sent',
              sent_at: new Date().toISOString(),
            },
            error: null,
          },
        },
        // 3. insert payout event
        {
          table: 'wimc_payout_events',
          result: { data: { id: 'evt-1' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      const result = await service.updateStatus(payoutId, 'sent', 'admin-1');

      expect(result.status).toBe('sent');
      expect(result.sent_at).toBeDefined();
    });
  });

  // ─── listBySeller ─────────────────────────────────────────────────

  describe('listBySeller', () => {
    it('should return payouts filtered by seller', async () => {
      const sellerId = 'seller-list-1';
      const payouts = [
        { id: 'p1', seller_id: sellerId, amount: 800, status: 'pending' },
        { id: 'p2', seller_id: sellerId, amount: 1200, status: 'sent' },
      ];

      const client = buildSequentialClient([
        {
          table: 'wimc_payouts',
          result: { data: payouts, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      const result = await service.listBySeller(sellerId);

      expect(result).toHaveLength(2);
      expect(result[0].seller_id).toBe(sellerId);
    });
  });
});
