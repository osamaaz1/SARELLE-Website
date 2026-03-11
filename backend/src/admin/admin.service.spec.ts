import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createMockSupabaseService, createMockQueryBuilder } from '../test-utils/mock-supabase';

describe('AdminService', () => {
  let service: AdminService;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return counts and revenue sum', async () => {
      // Mock multiple queries for different stats
      const usersQueryBuilder = createMockQueryBuilder(null, null, 150);
      const listingsQueryBuilder = createMockQueryBuilder(null, null, 75);
      const ordersQueryBuilder = createMockQueryBuilder(null, null, 42);
      const revenueQueryBuilder = createMockQueryBuilder([
        { total_revenue: 250000 },
      ]);

      let callCount = 0;
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (table === 'wimc_profiles') return usersQueryBuilder;
          if (table === 'wimc_listings') return listingsQueryBuilder;
          if (table === 'wimc_orders') {
            return callCount <= 3 ? ordersQueryBuilder : revenueQueryBuilder;
          }
          return usersQueryBuilder;
        }),
      } as any);

      const result = await service.getDashboardStats();

      expect(result).toHaveProperty('totalSubmissions');
      expect(result).toHaveProperty('totalListings');
      expect(result).toHaveProperty('totalOrders');
      expect(result).toHaveProperty('revenue');
      expect(result.totalSubmissions).toBe(150);
      expect(result.totalListings).toBe(75);
      expect(result.totalOrders).toBe(42);
    });
  });

  describe('getPipelineOverview', () => {
    it('should return counts for each submission stage', async () => {
      // getPipelineOverview fetches all submissions with .select('stage'), then
      // reduces them into a Record<string, number> counts map.
      const mockSubmissions = [
        { stage: 'pending_review' },
        { stage: 'pending_review' },
        { stage: 'price_suggested' },
        { stage: 'listed' },
      ];
      const queryBuilder = createMockQueryBuilder(mockSubmissions);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.getPipelineOverview();

      // Result is a Record<string, number>
      expect(result).toEqual({
        pending_review: 2,
        price_suggested: 1,
        listed: 1,
      });
      expect(queryBuilder.select).toHaveBeenCalledWith('stage');
    });
  });

  describe('listSellers', () => {
    it('should return paginated list of sellers', async () => {
      const mockSellers = [
        { id: 'seller-1', full_name: 'Seller One', role: 'seller', wimc_seller_profiles: { tier: 'gold', points: 1500 } },
        { id: 'seller-2', full_name: 'Seller Two', role: 'seller', wimc_seller_profiles: { tier: 'bronze', points: 100 } },
      ];
      const queryBuilder = createMockQueryBuilder(mockSellers, null, 25);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.listSellers(1, 10);

      expect(result).toHaveProperty('sellers');
      expect(result).toHaveProperty('total');
      expect(result.sellers).toEqual(mockSellers);
      expect(result.total).toBe(25);
      expect(queryBuilder.in).toHaveBeenCalledWith(
        'role',
        ['seller', 'vip_seller'],
      );
    });
  });

  describe('manageCelebrities', () => {
    it('should return all celebrities', async () => {
      const mockCelebrities = [
        { id: 'celeb-1', name: 'Celebrity One', verified: true },
        { id: 'celeb-2', name: 'Celebrity Two', verified: true },
      ];
      const queryBuilder = createMockQueryBuilder(mockCelebrities);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.manageCelebrities();

      expect(result).toEqual(mockCelebrities);
    });
  });

  describe('createCelebrity', () => {
    it('should insert a new celebrity with verified=true', async () => {
      const celebrityData = {
        name: 'New Celebrity',
        bio: 'Famous person',
        followers: '1M',
        user_id: 'user-123',
      };
      const mockCelebrity = {
        id: 'celeb-new',
        ...celebrityData,
        verified: true,
        created_at: new Date().toISOString(),
      };
      const queryBuilder = createMockQueryBuilder(mockCelebrity);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.createCelebrity(celebrityData);

      expect(result).toEqual(mockCelebrity);
      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ verified: true }),
      );
    });
  });
});
