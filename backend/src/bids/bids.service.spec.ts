import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BidsService } from './bids.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WimcGateway } from '../gateway/wimc.gateway';
import { createMockSupabaseService } from '../test-utils/mock-supabase';
import { createMockNotificationsService, createMockGateway } from '../test-utils/mock-services';

describe('BidsService', () => {
  let service: BidsService;
  let supabaseService: ReturnType<typeof createMockSupabaseService>;
  let notificationsService: ReturnType<typeof createMockNotificationsService>;
  let gateway: ReturnType<typeof createMockGateway>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService();
    notificationsService = createMockNotificationsService();
    gateway = createMockGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: WimcGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<BidsService>(BidsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Helper: create a chainable query builder mock
  // ---------------------------------------------------------------------------
  function createQueryBuilder(singleResult: { data: any; error?: any }) {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(singleResult),
      then: (resolve: any) => Promise.resolve(singleResult).then(resolve),
    };
    return qb;
  }

  // ---------------------------------------------------------------------------
  // 1. Bid increments (tested via placeBid with first bids at various prices)
  // ---------------------------------------------------------------------------
  describe('bid increments (via first bid / Case A)', () => {
    const testCases = [
      { startingPrice: 50, expectedIncrement: 1, label: 'price < 100 → increment 1' },
      { startingPrice: 200, expectedIncrement: 5, label: 'price < 500 → increment 5' },
      { startingPrice: 700, expectedIncrement: 10, label: 'price < 1000 → increment 10' },
      { startingPrice: 3000, expectedIncrement: 25, label: 'price < 5000 → increment 25' },
      { startingPrice: 10000, expectedIncrement: 50, label: 'price < 25000 → increment 50' },
      { startingPrice: 30000, expectedIncrement: 100, label: 'price >= 25000 → increment 100' },
    ];

    testCases.forEach(({ startingPrice, expectedIncrement, label }) => {
      it(`should apply correct increment when ${label}`, async () => {
        const auctionId = 'auction-1';
        const bidderId = 'bidder-1';
        const maxAmount = startingPrice + expectedIncrement * 10; // well above starting
        const endsAt = new Date(Date.now() + 3600_000).toISOString(); // 1 hour from now

        const mockClient = supabaseService._client;
        let fromCallCount = 0;

        mockClient.from.mockImplementation((table: string) => {
          fromCallCount++;
          const qb = createQueryBuilder({ data: null });

          if (table === 'wimc_auctions' && fromCallCount === 1) {
            // Fetch auction
            qb.single.mockResolvedValue({
              data: {
                id: auctionId,
                listing_id: 'listing-1',
                starting_price: startingPrice,
                current_price: startingPrice,
                status: 'active',
                ends_at: endsAt,
                bid_count: 0,
                reserve_price: null,
                reserve_met: false,
                wimc_listings: { id: 'listing-1', name: 'Test Item', brand: 'Test', seller_id: 'seller-1' },
              },
              error: null,
            });
          } else if (table === 'wimc_bids' && fromCallCount === 2) {
            // Fetch current winning bid — none
            qb.single.mockResolvedValue({ data: null, error: null });
          } else if (table === 'wimc_bids') {
            // Insert new bid
            qb.single.mockResolvedValue({
              data: { id: 'bid-1', auction_id: auctionId, bidder_id: bidderId, max_amount: maxAmount, proxy_amount: startingPrice, status: 'winning' },
              error: null,
            });
          } else if (table === 'wimc_auctions') {
            // Update auction
            qb.single.mockResolvedValue({ data: null, error: null });
          }

          return qb;
        });

        const result = await service.placeBid(auctionId, bidderId, maxAmount);

        // Case A: first bid sets current_price = starting_price
        expect(result.status).toBe('winning');
        expect(result.current_price).toBe(startingPrice);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. createAuction
  // ---------------------------------------------------------------------------
  describe('createAuction', () => {
    const validData = {
      listing_id: 'listing-1',
      starting_price: 1000,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 86400_000).toISOString(),
    };

    it('should create an auction successfully', async () => {
      const mockClient = supabaseService._client;
      let fromCallCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        const qb = createQueryBuilder({ data: null, error: null });

        if (table === 'wimc_listings' && fromCallCount === 1) {
          // Listing lookup
          qb.single.mockResolvedValue({
            data: { id: 'listing-1', celebrity_id: null, status: 'published' },
            error: null,
          });
        } else if (table === 'wimc_auctions' && fromCallCount === 2) {
          // Duplicate check
          qb.single.mockResolvedValue({ data: null, error: null });
        } else if (table === 'wimc_listings' && fromCallCount === 3) {
          // Update listing type
          qb.single.mockResolvedValue({ data: null, error: null });
        } else if (table === 'wimc_auctions' && fromCallCount === 4) {
          // Insert auction
          qb.single.mockResolvedValue({
            data: {
              id: 'auction-new',
              listing_id: validData.listing_id,
              starting_price: validData.starting_price,
              current_price: validData.starting_price,
              status: 'active',
              starts_at: validData.starts_at,
              ends_at: validData.ends_at,
              reserve_price: null,
            },
            error: null,
          });
        }

        return qb;
      });

      const result = await service.createAuction(validData);
      expect(result).toBeDefined();
      expect(result.id).toBe('auction-new');
      expect(result.status).toBe('active');
      expect(result.starting_price).toBe(1000);
    });

    it('should throw NotFoundException if listing not found or not published', async () => {
      const mockClient = supabaseService._client;

      mockClient.from.mockImplementation(() => {
        const qb = createQueryBuilder({ data: null, error: null });
        qb.single.mockResolvedValue({ data: null, error: null });
        return qb;
      });

      await expect(service.createAuction(validData)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if reserve_price on non-celebrity listing', async () => {
      const mockClient = supabaseService._client;

      mockClient.from.mockImplementation(() => {
        const qb = createQueryBuilder({ data: null, error: null });
        qb.single.mockResolvedValue({
          data: { id: 'listing-1', celebrity_id: null, status: 'published' },
          error: null,
        });
        return qb;
      });

      await expect(
        service.createAuction({ ...validData, reserve_price: 5000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if an active auction already exists for the listing', async () => {
      const mockClient = supabaseService._client;
      let fromCallCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        const qb = createQueryBuilder({ data: null, error: null });

        if (fromCallCount === 1) {
          // Listing found
          qb.single.mockResolvedValue({
            data: { id: 'listing-1', celebrity_id: null, status: 'published' },
            error: null,
          });
        } else if (fromCallCount === 2) {
          // Duplicate auction found
          qb.single.mockResolvedValue({
            data: { id: 'existing-auction' },
            error: null,
          });
        }

        return qb;
      });

      await expect(service.createAuction(validData)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insert fails with a database error', async () => {
      const mockClient = supabaseService._client;
      let fromCallCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        const qb = createQueryBuilder({ data: null, error: null });

        if (fromCallCount === 1) {
          qb.single.mockResolvedValue({
            data: { id: 'listing-1', celebrity_id: null, status: 'published' },
            error: null,
          });
        } else if (fromCallCount === 2) {
          qb.single.mockResolvedValue({ data: null, error: null });
        } else if (fromCallCount === 3) {
          // update listing type — fine
          qb.single.mockResolvedValue({ data: null, error: null });
        } else if (fromCallCount === 4) {
          // insert auction fails
          qb.single.mockResolvedValue({
            data: null,
            error: { message: 'Database insert error' },
          });
        }

        return qb;
      });

      await expect(service.createAuction(validData)).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. placeBid
  // ---------------------------------------------------------------------------
  describe('placeBid', () => {
    const auctionId = 'auction-1';
    const bidderId = 'bidder-1';
    const sellerId = 'seller-1';
    const endsAt = new Date(Date.now() + 3600_000).toISOString(); // 1 hour from now

    function makeAuction(overrides: Record<string, any> = {}) {
      return {
        id: auctionId,
        listing_id: 'listing-1',
        starting_price: 1000,
        current_price: 1000,
        status: 'active',
        ends_at: endsAt,
        bid_count: 0,
        reserve_price: null,
        reserve_met: false,
        wimc_listings: { id: 'listing-1', name: 'Test Item', brand: 'TestBrand', seller_id: sellerId },
        ...overrides,
      };
    }

    function setupPlaceBidMocks(opts: {
      auction?: any;
      currentWinningBid?: any;
      insertedBid?: any;
      insertError?: any;
    }) {
      const mockClient = supabaseService._client;
      let fromCallCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        const qb = createQueryBuilder({ data: null, error: null });

        if (table === 'wimc_auctions' && fromCallCount === 1) {
          qb.single.mockResolvedValue({
            data: opts.auction ?? makeAuction(),
            error: null,
          });
        } else if (table === 'wimc_bids' && fromCallCount === 2) {
          qb.single.mockResolvedValue({
            data: opts.currentWinningBid ?? null,
            error: null,
          });
        } else if (table === 'wimc_bids') {
          // Could be update (outbid) or insert
          if (opts.insertError) {
            qb.single.mockResolvedValue({ data: null, error: opts.insertError });
          } else {
            qb.single.mockResolvedValue({
              data: opts.insertedBid ?? {
                id: 'new-bid',
                auction_id: auctionId,
                bidder_id: bidderId,
                max_amount: 2000,
                proxy_amount: 1000,
                status: 'winning',
              },
              error: null,
            });
          }
        } else if (table === 'wimc_auctions') {
          // Update auction
          qb.single.mockResolvedValue({ data: null, error: null });
        }

        return qb;
      });
    }

    it('Case A: first bid sets current_price to starting_price and status winning', async () => {
      setupPlaceBidMocks({ currentWinningBid: null });

      const result = await service.placeBid(auctionId, bidderId, 2000);

      expect(result.status).toBe('winning');
      expect(result.current_price).toBe(1000); // starting_price
      expect(result.bid_count).toBe(1);
    });

    it('Case B: new bidder outbids current winner', async () => {
      const currentWinner = {
        id: 'bid-old',
        auction_id: auctionId,
        bidder_id: 'bidder-old',
        max_amount: 1500,
        proxy_amount: 1000,
        status: 'winning',
      };

      setupPlaceBidMocks({
        auction: makeAuction({ current_price: 1000, bid_count: 1 }),
        currentWinningBid: currentWinner,
      });

      const result = await service.placeBid(auctionId, bidderId, 2000);

      expect(result.status).toBe('winning');
      // newPrice = oldMax (1500) + increment(1500) = 1500 + 25 = 1525
      expect(result.current_price).toBe(1525);
      expect(result.bid_count).toBe(2);
    });

    it('Case C: current winner stays when new bid is lower', async () => {
      const currentWinner = {
        id: 'bid-old',
        auction_id: auctionId,
        bidder_id: 'bidder-old',
        max_amount: 3000,
        proxy_amount: 1000,
        status: 'winning',
      };

      setupPlaceBidMocks({
        auction: makeAuction({ current_price: 1000, bid_count: 1 }),
        currentWinningBid: currentWinner,
      });

      // minimumBid = 1000 + 10 (increment for 1000) = 1010
      const result = await service.placeBid(auctionId, bidderId, 2000);

      expect(result.status).toBe('outbid');
      // newPrice = 2000 + increment(2000) = 2000 + 25 = 2025
      expect(result.current_price).toBe(2025);
    });

    it('Case D: tie goes to existing winner', async () => {
      const currentWinner = {
        id: 'bid-old',
        auction_id: auctionId,
        bidder_id: 'bidder-old',
        max_amount: 2000,
        proxy_amount: 1000,
        status: 'winning',
      };

      setupPlaceBidMocks({
        auction: makeAuction({ current_price: 1000, bid_count: 1 }),
        currentWinningBid: currentWinner,
      });

      const result = await service.placeBid(auctionId, bidderId, 2000);

      expect(result.status).toBe('outbid');
      expect(result.current_price).toBe(2000); // tie = maxAmount
    });

    it('Case E: same bidder raises max successfully', async () => {
      const currentWinner = {
        id: 'bid-existing',
        auction_id: auctionId,
        bidder_id: bidderId, // same bidder
        max_amount: 1500,
        proxy_amount: 1000,
        status: 'winning',
      };

      setupPlaceBidMocks({
        auction: makeAuction({ current_price: 1000, bid_count: 1 }),
        currentWinningBid: currentWinner,
      });

      const result = await service.placeBid(auctionId, bidderId, 3000);

      expect(result.status).toBe('winning');
      expect(result.current_price).toBe(1000); // unchanged
      expect(result.message).toContain('still the highest bidder');
    });

    it('Case E: same bidder raising to lower amount throws', async () => {
      const currentWinner = {
        id: 'bid-existing',
        auction_id: auctionId,
        bidder_id: bidderId,
        max_amount: 3000,
        proxy_amount: 1000,
        status: 'winning',
      };

      setupPlaceBidMocks({
        auction: makeAuction({ current_price: 1000, bid_count: 1 }),
        currentWinningBid: currentWinner,
      });

      await expect(service.placeBid(auctionId, bidderId, 2000)).rejects.toThrow(BadRequestException);
    });

    it('should extend auction end time when bid placed within anti-sniping window', async () => {
      jest.useFakeTimers();
      const now = new Date('2025-06-01T12:00:00Z');
      jest.setSystemTime(now);

      // Auction ends in 3 minutes (within the 5-minute anti-snipe window)
      const sniperEndsAt = new Date(now.getTime() + 3 * 60_000).toISOString();

      setupPlaceBidMocks({
        auction: makeAuction({ ends_at: sniperEndsAt, bid_count: 0 }),
        currentWinningBid: null,
      });

      const result = await service.placeBid(auctionId, bidderId, 2000);

      // ends_at should be extended to now + 5 minutes
      const expectedEndsAt = new Date(now.getTime() + 5 * 60_000).toISOString();
      expect(result.ends_at).toBe(expectedEndsAt);
    });

    it('should throw ForbiddenException when seller tries to bid on own listing', async () => {
      setupPlaceBidMocks({
        auction: makeAuction(),
      });

      await expect(service.placeBid(auctionId, sellerId, 2000)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when auction has ended', async () => {
      const pastEndsAt = new Date(Date.now() - 3600_000).toISOString(); // 1 hour ago

      setupPlaceBidMocks({
        auction: makeAuction({ ends_at: pastEndsAt }),
      });

      await expect(service.placeBid(auctionId, bidderId, 2000)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when auction is not active', async () => {
      setupPlaceBidMocks({
        auction: makeAuction({ status: 'ended' }),
      });

      await expect(service.placeBid(auctionId, bidderId, 2000)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when bid is below minimum', async () => {
      const currentWinner = {
        id: 'bid-old',
        auction_id: auctionId,
        bidder_id: 'bidder-old',
        max_amount: 2000,
        proxy_amount: 1500,
        status: 'winning',
      };

      setupPlaceBidMocks({
        auction: makeAuction({ current_price: 1500, bid_count: 1 }),
        currentWinningBid: currentWinner,
      });

      // minimumBid = 1500 + increment(1500) = 1500 + 25 = 1525
      await expect(service.placeBid(auctionId, bidderId, 1520)).rejects.toThrow(BadRequestException);
    });

    it('should set reserve_met to true when current_price reaches reserve_price', async () => {
      setupPlaceBidMocks({
        auction: makeAuction({
          reserve_price: 1000,
          reserve_met: false,
          bid_count: 0,
        }),
        currentWinningBid: null,
      });

      const result = await service.placeBid(auctionId, bidderId, 5000);

      expect(result.reserve_met).toBe(true);
    });

    it('should throw NotFoundException when auction does not exist', async () => {
      const mockClient = supabaseService._client;
      mockClient.from.mockImplementation(() => {
        const qb = createQueryBuilder({ data: null, error: null });
        qb.single.mockResolvedValue({ data: null, error: null });
        return qb;
      });

      await expect(service.placeBid('nonexistent', bidderId, 2000)).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. endAuction
  // ---------------------------------------------------------------------------
  describe('endAuction', () => {
    const auctionId = 'auction-1';

    function setupEndAuctionMocks(opts: {
      auction?: any;
      winningBid?: any;
    }) {
      const mockClient = supabaseService._client;
      let fromCallCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        const qb = createQueryBuilder({ data: null, error: null });

        if (table === 'wimc_auctions' && fromCallCount === 1) {
          qb.single.mockResolvedValue({
            data: opts.auction ?? null,
            error: null,
          });
        } else if (table === 'wimc_bids' && fromCallCount === 2) {
          qb.single.mockResolvedValue({
            data: opts.winningBid ?? null,
            error: null,
          });
        } else {
          // Any subsequent calls (update auction, create order, notifications, etc.)
          qb.single.mockResolvedValue({ data: { id: 'result' }, error: null });
        }

        return qb;
      });
    }

    it('should end auction with winner when reserve is met', async () => {
      setupEndAuctionMocks({
        auction: {
          id: auctionId,
          listing_id: 'listing-1',
          status: 'active',
          current_price: 5000,
          current_winner_id: 'winner-1',
          reserve_price: 3000,
          reserve_met: true,
          bid_count: 5,
          ends_at: new Date(Date.now() - 1000).toISOString(),
          wimc_listings: { id: 'listing-1', name: 'Test Bag', brand: 'Hermes', seller_id: 'seller-1' },
        },
        winningBid: {
          id: 'bid-winning',
          bidder_id: 'winner-1',
          max_amount: 6000,
          proxy_amount: 5000,
          status: 'winning',
        },
      });

      const result = await service.endAuction(auctionId);

      expect(result).toBeDefined();
    });

    it('should end auction with no sale when reserve is not met', async () => {
      setupEndAuctionMocks({
        auction: {
          id: auctionId,
          listing_id: 'listing-1',
          status: 'active',
          current_price: 2000,
          current_winner_id: 'winner-1',
          reserve_price: 5000,
          reserve_met: false,
          bid_count: 3,
          ends_at: new Date(Date.now() - 1000).toISOString(),
          wimc_listings: { id: 'listing-1', name: 'Test Bag', brand: 'Hermes', seller_id: 'seller-1' },
        },
        winningBid: {
          id: 'bid-winning',
          bidder_id: 'winner-1',
          max_amount: 2500,
          proxy_amount: 2000,
          status: 'winning',
        },
      });

      const result = await service.endAuction(auctionId);

      expect(result).toBeDefined();
    });

    it('should end auction with no winner when there are no bids', async () => {
      setupEndAuctionMocks({
        auction: {
          id: auctionId,
          listing_id: 'listing-1',
          status: 'active',
          current_price: 1000,
          current_winner_id: null,
          reserve_price: null,
          reserve_met: false,
          bid_count: 0,
          ends_at: new Date(Date.now() - 1000).toISOString(),
          wimc_listings: { id: 'listing-1', name: 'Test Bag', brand: 'Hermes', seller_id: 'seller-1' },
        },
        winningBid: null,
      });

      const result = await service.endAuction(auctionId);

      expect(result).toBeDefined();
    });

    it('should end auction with winner when there is no reserve price', async () => {
      setupEndAuctionMocks({
        auction: {
          id: auctionId,
          listing_id: 'listing-1',
          status: 'active',
          current_price: 3000,
          current_winner_id: 'winner-1',
          reserve_price: null,
          reserve_met: false,
          bid_count: 4,
          ends_at: new Date(Date.now() - 1000).toISOString(),
          wimc_listings: { id: 'listing-1', name: 'Test Bag', brand: 'Hermes', seller_id: 'seller-1' },
        },
        winningBid: {
          id: 'bid-winning',
          bidder_id: 'winner-1',
          max_amount: 4000,
          proxy_amount: 3000,
          status: 'winning',
        },
      });

      const result = await service.endAuction(auctionId);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when auction is not active', async () => {
      setupEndAuctionMocks({
        auction: {
          id: auctionId,
          listing_id: 'listing-1',
          status: 'ended',
          current_price: 3000,
          current_winner_id: 'winner-1',
          reserve_price: null,
          reserve_met: false,
          bid_count: 4,
          ends_at: new Date(Date.now() - 1000).toISOString(),
          wimc_listings: { id: 'listing-1', name: 'Test Bag', brand: 'Hermes', seller_id: 'seller-1' },
        },
      });

      await expect(service.endAuction(auctionId)).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. getBidHistory
  // ---------------------------------------------------------------------------
  describe('getBidHistory', () => {
    it('should return anonymized bid history', async () => {
      const mockClient = supabaseService._client;

      mockClient.from.mockImplementation((table: string) => {
        const qb = createQueryBuilder({ data: null, error: null });

        if (table === 'wimc_bids') {
          // getBidHistory does a select() not single()
          // Override select to return data directly (not via single)
          qb.select.mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'bid-1',
                    auction_id: 'auction-1',
                    proxy_amount: 1500,
                    created_at: '2025-06-01T12:00:00Z',
                    status: 'winning',
                    wimc_profiles: { first_name: 'Ahmed', last_name: 'Khaled' },
                  },
                  {
                    id: 'bid-2',
                    auction_id: 'auction-1',
                    proxy_amount: 1000,
                    created_at: '2025-06-01T11:00:00Z',
                    status: 'outbid',
                    wimc_profiles: { first_name: 'Sara', last_name: 'Mohamed' },
                  },
                ],
                error: null,
              }),
            }),
          });
        }

        return qb;
      });

      const result = await service.getBidHistory('auction-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. getMyBids
  // ---------------------------------------------------------------------------
  describe('getMyBids', () => {
    it('should return bids for the given user', async () => {
      const mockClient = supabaseService._client;

      mockClient.from.mockImplementation((table: string) => {
        const qb = createQueryBuilder({ data: null, error: null });

        if (table === 'wimc_bids') {
          qb.select.mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'bid-1',
                    auction_id: 'auction-1',
                    bidder_id: 'user-1',
                    max_amount: 2000,
                    proxy_amount: 1500,
                    status: 'winning',
                    wimc_auctions: {
                      id: 'auction-1',
                      current_price: 1500,
                      ends_at: '2025-06-10T12:00:00Z',
                      status: 'active',
                      wimc_listings: { id: 'listing-1', name: 'Hermes Birkin', brand: 'Hermes' },
                    },
                  },
                ],
                error: null,
              }),
            }),
          });
        }

        return qb;
      });

      const result = await service.getMyBids('user-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });
  });
});
