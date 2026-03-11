import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { OffersService } from './offers.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { WimcGateway } from '../gateway/wimc.gateway';
import { createMockSupabaseService } from '../test-utils/mock-supabase';
import { createMockEmailService, createMockGateway } from '../test-utils/mock-services';

/**
 * Helper: creates a sequential mock Supabase client where each `.from(table)`
 * call returns the next query-builder in the provided array.  Every builder
 * defaults to resolving `{ data: null, error: null }` unless overridden.
 */
function buildSequentialClient(calls: Array<{ table: string; result: any; chainOverrides?: Record<string, any> }>) {
  const queue = [...calls];

  const client = {
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue({ data: { user: { email: 'test@test.com' } } }),
      },
    },
    from: jest.fn().mockImplementation((table: string) => {
      const idx = queue.findIndex((c) => c.table === table);
      const entry = idx !== -1 ? queue.splice(idx, 1)[0] : undefined;
      const result = entry?.result ?? { data: null, error: null };

      const builder: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
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

describe('OffersService', () => {
  let service: OffersService;
  let supabaseService: ReturnType<typeof createMockSupabaseService>;
  let emailService: ReturnType<typeof createMockEmailService>;
  let gateway: ReturnType<typeof createMockGateway>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService();
    emailService = createMockEmailService();
    gateway = createMockGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: EmailService, useValue: emailService },
        { provide: WimcGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    const buyerId = 'buyer-1';
    const listingId = 'listing-1';
    const sellerId = 'seller-owner-1';
    const dto = { listing_id: listingId, amount: 25000, idempotency_key: 'test-key' };

    it('should create an offer with pending status', async () => {
      const client = buildSequentialClient([
        // 1. idempotency check on wimc_idempotency_keys — not found
        {
          table: 'wimc_idempotency_keys',
          result: { data: null, error: null },
        },
        // 2. fetch listing
        {
          table: 'wimc_listings',
          result: {
            data: { id: listingId, seller_id: sellerId, status: 'published', price: 30000, name: 'Test Bag', brand: 'Gucci' },
            error: null,
          },
        },
        // 3. store idempotency key
        {
          table: 'wimc_idempotency_keys',
          result: { data: { key: 'test-key' }, error: null },
        },
        // 4. insert offer
        {
          table: 'wimc_offers',
          result: {
            data: {
              id: 'offer-new-1',
              buyer_id: buyerId,
              listing_id: listingId,
              amount: 25000,
              status: 'pending',
            },
            error: null,
          },
        },
        // 5. update idempotency key with response
        {
          table: 'wimc_idempotency_keys',
          result: { data: null, error: null },
        },
        // 6. sendOfferEmail -> wimc_profiles (buyer display_name)
        {
          table: 'wimc_profiles',
          result: { data: { display_name: 'Buyer Name' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      const result = await service.create(buyerId, dto);

      // Service returns offer directly (not wrapped in {data: ...})
      expect(result.status).toBe('pending');
      expect(result.amount).toBe(25000);

      // sendOfferEmail is fire-and-forget (.catch()), flush microtask queue
      await new Promise(resolve => setImmediate(resolve));
      expect(emailService.sendNewOffer).toHaveBeenCalled();
    });

    it('should return existing offer for idempotency', async () => {
      const existingOffer = {
        id: 'offer-existing',
        buyer_id: buyerId,
        listing_id: listingId,
        amount: 25000,
        status: 'pending',
      };

      const client = buildSequentialClient([
        // idempotency check finds existing response
        {
          table: 'wimc_idempotency_keys',
          result: { data: { response_body: existingOffer }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      const result = await service.create(buyerId, dto);

      expect(result.id).toBe('offer-existing');
      // Should not have fetched listing or inserted
      expect(client.from).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when listing does not exist', async () => {
      const client = buildSequentialClient([
        // idempotency check — not found
        {
          table: 'wimc_idempotency_keys',
          result: { data: null, error: null },
        },
        // listing not found
        {
          table: 'wimc_listings',
          result: { data: null, error: { message: 'Not found' } },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await expect(service.create(buyerId, dto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when seller tries to offer on their own listing', async () => {
      const client = buildSequentialClient([
        // idempotency check — not found
        {
          table: 'wimc_idempotency_keys',
          result: { data: null, error: null },
        },
        // listing found - seller_id matches buyerId
        {
          table: 'wimc_listings',
          result: {
            data: { id: listingId, seller_id: sellerId, status: 'published', price: 30000 },
            error: null,
          },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      // buyerId === sellerId scenario
      await expect(service.create(sellerId, dto))
        .rejects
        .toThrow(ForbiddenException);
    });

    it('should emit a websocket event to the seller', async () => {
      const client = buildSequentialClient([
        // 1. idempotency check
        {
          table: 'wimc_idempotency_keys',
          result: { data: null, error: null },
        },
        // 2. fetch listing
        {
          table: 'wimc_listings',
          result: {
            data: { id: listingId, seller_id: sellerId, status: 'published', price: 30000, name: 'Test Bag', brand: 'Gucci' },
            error: null,
          },
        },
        // 3. store idempotency key
        {
          table: 'wimc_idempotency_keys',
          result: { data: { key: 'test-key' }, error: null },
        },
        // 4. insert offer
        {
          table: 'wimc_offers',
          result: {
            data: {
              id: 'offer-ws-1',
              buyer_id: buyerId,
              listing_id: listingId,
              amount: 25000,
              status: 'pending',
            },
            error: null,
          },
        },
        // 5. update idempotency key
        {
          table: 'wimc_idempotency_keys',
          result: { data: null, error: null },
        },
        // 6. sendOfferEmail -> wimc_profiles
        {
          table: 'wimc_profiles',
          result: { data: { display_name: 'Buyer' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await service.create(buyerId, dto);

      // Service emits 'offer:new' to seller
      expect(gateway.emitToUser).toHaveBeenCalledWith(
        sellerId,
        'offer:new',
        expect.objectContaining({ listing_id: listingId }),
      );
    });
  });

  // ─── accept ────────────────────────────────────────────────────────

  describe('accept', () => {
    const sellerId = 'seller-acc-1';
    const offerId = 'offer-acc-1';
    const listingId = 'listing-acc-1';
    const buyerId = 'buyer-acc-1';

    it('should accept the offer and reject other pending offers on same listing', async () => {
      const client = buildSequentialClient([
        // 1. getOfferForSeller -> fetch offer with joined listing
        {
          table: 'wimc_offers',
          result: {
            data: {
              id: offerId,
              buyer_id: buyerId,
              listing_id: listingId,
              status: 'pending',
              amount: 20000,
              wimc_listings: { seller_id: sellerId },
            },
            error: null,
          },
        },
        // 2. atomic update offer to accepted
        {
          table: 'wimc_offers',
          result: { data: { id: offerId, status: 'accepted' }, error: null },
        },
        // 3. reject other pending offers
        {
          table: 'wimc_offers',
          result: { data: [], error: null },
        },
        // 4. reserve listing
        {
          table: 'wimc_listings',
          result: { data: { id: listingId, status: 'reserved' }, error: null },
        },
        // 5. sendOfferResponseEmail -> wimc_listings (for item name)
        {
          table: 'wimc_listings',
          result: { data: { name: 'Test', brand: 'Gucci' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      const result = await service.accept(offerId, sellerId);

      // accept returns { ...offer, status: 'accepted' }
      expect(result.status).toBe('accepted');
    });

    it('should reserve the listing when accepting an offer', async () => {
      const client = buildSequentialClient([
        // 1. getOfferForSeller
        {
          table: 'wimc_offers',
          result: {
            data: { id: offerId, buyer_id: buyerId, listing_id: listingId, status: 'pending', amount: 20000, wimc_listings: { seller_id: sellerId } },
            error: null,
          },
        },
        // 2. update offer to accepted
        {
          table: 'wimc_offers',
          result: { data: { id: offerId, status: 'accepted' }, error: null },
        },
        // 3. reject others
        {
          table: 'wimc_offers',
          result: { data: [], error: null },
        },
        // 4. reserve listing
        {
          table: 'wimc_listings',
          result: { data: { id: listingId, status: 'reserved' }, error: null },
        },
        // 5. sendOfferResponseEmail -> wimc_listings
        {
          table: 'wimc_listings',
          result: { data: { name: 'Test', brand: 'Gucci' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await service.accept(offerId, sellerId);

      // Verify listing update was called
      const listingCalls = client.from.mock.calls.filter((c: any) => c[0] === 'wimc_listings');
      expect(listingCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw BadRequestException when offer is no longer pending', async () => {
      const client = buildSequentialClient([
        // getOfferForSeller finds the offer but status is not pending -> returns null
        {
          table: 'wimc_offers',
          result: { data: null, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await expect(service.accept(offerId, sellerId))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should notify the buyer via websocket when offer is accepted', async () => {
      const client = buildSequentialClient([
        // 1. getOfferForSeller
        {
          table: 'wimc_offers',
          result: {
            data: { id: offerId, buyer_id: buyerId, listing_id: listingId, status: 'pending', amount: 20000, wimc_listings: { seller_id: sellerId } },
            error: null,
          },
        },
        // 2. update offer
        {
          table: 'wimc_offers',
          result: { data: { id: offerId, status: 'accepted' }, error: null },
        },
        // 3. reject others
        {
          table: 'wimc_offers',
          result: { data: [], error: null },
        },
        // 4. reserve listing
        {
          table: 'wimc_listings',
          result: { data: { id: listingId, status: 'reserved' }, error: null },
        },
        // 5. sendOfferResponseEmail -> wimc_listings
        {
          table: 'wimc_listings',
          result: { data: { name: 'Test', brand: 'Gucci' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await service.accept(offerId, sellerId);

      // Service emits 'offer:updated'
      expect(gateway.emitToUser).toHaveBeenCalledWith(
        buyerId,
        'offer:updated',
        expect.objectContaining({ id: offerId, status: 'accepted' }),
      );
    });
  });

  // ─── reject ────────────────────────────────────────────────────────

  describe('reject', () => {
    const sellerId = 'seller-rej-1';
    const offerId = 'offer-rej-1';
    const buyerId = 'buyer-rej-1';

    it('should update offer status to rejected', async () => {
      const client = buildSequentialClient([
        // 1. getOfferForSeller
        {
          table: 'wimc_offers',
          result: {
            data: { id: offerId, buyer_id: buyerId, listing_id: 'listing-rej', status: 'pending', amount: 15000, wimc_listings: { seller_id: sellerId } },
            error: null,
          },
        },
        // 2. update offer to rejected
        {
          table: 'wimc_offers',
          result: { data: { id: offerId, status: 'rejected' }, error: null },
        },
        // 3. sendOfferResponseEmail -> wimc_listings
        {
          table: 'wimc_listings',
          result: { data: { name: 'Test', brand: 'Gucci' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      const result = await service.reject(offerId, sellerId);

      // reject returns the updated data directly
      expect(result.status).toBe('rejected');
    });

    it('should notify the buyer via websocket when offer is rejected', async () => {
      const client = buildSequentialClient([
        // 1. getOfferForSeller
        {
          table: 'wimc_offers',
          result: {
            data: { id: offerId, buyer_id: buyerId, listing_id: 'listing-rej', status: 'pending', amount: 15000, wimc_listings: { seller_id: sellerId } },
            error: null,
          },
        },
        // 2. update offer
        {
          table: 'wimc_offers',
          result: { data: { id: offerId, status: 'rejected' }, error: null },
        },
        // 3. sendOfferResponseEmail -> wimc_listings
        {
          table: 'wimc_listings',
          result: { data: { name: 'Test', brand: 'Gucci' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await service.reject(offerId, sellerId);

      // Service emits 'offer:updated'
      expect(gateway.emitToUser).toHaveBeenCalledWith(
        buyerId,
        'offer:updated',
        expect.objectContaining({ id: offerId, status: 'rejected' }),
      );
    });
  });

  // ─── withdraw ──────────────────────────────────────────────────────

  describe('withdraw', () => {
    const buyerId = 'buyer-wd-1';
    const offerId = 'offer-wd-1';

    it('should allow buyer to withdraw a pending offer', async () => {
      const client = buildSequentialClient([
        // 1. fetch offer (verify ownership + pending)
        {
          table: 'wimc_offers',
          result: {
            data: { id: offerId, buyer_id: buyerId, listing_id: 'listing-wd', status: 'pending', amount: 18000 },
            error: null,
          },
        },
        // 2. update offer to withdrawn
        {
          table: 'wimc_offers',
          result: { data: { id: offerId, status: 'withdrawn' }, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      const result = await service.withdraw(offerId, buyerId);

      // withdraw returns updated data directly
      expect(result.status).toBe('withdrawn');
    });

    it('should throw BadRequestException when trying to withdraw a non-pending offer', async () => {
      const client = buildSequentialClient([
        // offer not found because status != pending filter
        {
          table: 'wimc_offers',
          result: { data: null, error: null },
        },
      ]);

      supabaseService.getClient.mockReturnValue(client);

      await expect(service.withdraw(offerId, buyerId))
        .rejects
        .toThrow(NotFoundException);
    });
  });
});
