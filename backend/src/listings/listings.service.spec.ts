import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createMockSupabaseService, createMockQueryBuilder } from '../test-utils/mock-supabase';

describe('ListingsService', () => {
  let service: ListingsService;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('browse', () => {
    it('should return listings with pagination', async () => {
      const mockListings = [
        { id: '1', title: 'Gucci Bag', price: 5000, category: 'bags' },
        { id: '2', title: 'Rolex Watch', price: 15000, category: 'watches' },
      ];
      const queryBuilder = createMockQueryBuilder(mockListings, null, 20);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.browse({ page: 1, limit: 10 });

      expect(result).toHaveProperty('listings');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('total');
      expect(result.listings).toEqual(mockListings);
      expect(result.total).toBe(20);
    });

    it('should apply search filter', async () => {
      const mockListings = [{ id: '1', title: 'Gucci Bag', price: 5000 }];
      const queryBuilder = createMockQueryBuilder(mockListings, null, 1);
      const fromMock = jest.fn().mockReturnValue(queryBuilder);
      supabaseService.getClient.mockReturnValue({ from: fromMock } as any);

      await service.browse({ page: 1, limit: 10, search: 'Gucci' });

      expect(queryBuilder.or).toHaveBeenCalledWith(expect.stringContaining('Gucci'));
    });

    it('should apply category filter', async () => {
      const mockListings = [{ id: '1', title: 'Gucci Bag', price: 5000, category: 'bags' }];
      const queryBuilder = createMockQueryBuilder(mockListings, null, 1);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      await service.browse({ page: 1, limit: 10, category: 'bags' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('category', 'bags');
    });

    it('should apply price range filters (minPrice, maxPrice)', async () => {
      const mockListings = [{ id: '1', title: 'Mid Range Item', price: 3000 }];
      const queryBuilder = createMockQueryBuilder(mockListings, null, 1);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      await service.browse({ page: 1, limit: 10, minPrice: 1000, maxPrice: 5000 });

      expect(queryBuilder.gte).toHaveBeenCalledWith('price', 1000);
      expect(queryBuilder.lte).toHaveBeenCalledWith('price', 5000);
    });

    it('should sort by price_asc', async () => {
      const mockListings = [
        { id: '1', title: 'Cheap Item', price: 1000 },
        { id: '2', title: 'Expensive Item', price: 10000 },
      ];
      const queryBuilder = createMockQueryBuilder(mockListings, null, 2);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      await service.browse({ page: 1, limit: 10, sort: 'price_asc' });

      expect(queryBuilder.order).toHaveBeenCalledWith('price', { ascending: true });
    });

    it('should default to newest sort', async () => {
      const mockListings = [{ id: '1', title: 'New Item', price: 5000 }];
      const queryBuilder = createMockQueryBuilder(mockListings, null, 1);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      await service.browse({ page: 1, limit: 10 });

      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('getById', () => {
    it('should return listing with seller profile', async () => {
      const mockListing = {
        id: 'listing-1',
        title: 'Chanel Bag',
        price: 8000,
        seller_id: 'seller-1',
        wimc_profiles: { full_name: 'Jane Doe', avatar_url: null },
      };
      const queryBuilder = createMockQueryBuilder(mockListing);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.getById('listing-1');

      expect(result).toEqual(mockListing);
      expect(queryBuilder.select).toHaveBeenCalledWith(expect.stringContaining('wimc_profiles'));
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'listing-1');
    });

    it('should throw NotFoundException when listing not found', async () => {
      const queryBuilder = createMockQueryBuilder(null, { code: 'PGRST116', message: 'not found' });
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFeatured', () => {
    it('should return featured listings when available', async () => {
      const mockFeatured = [
        { id: '1', title: 'Featured Bag', featured: true },
        { id: '2', title: 'Featured Watch', featured: true },
      ];
      const queryBuilder = createMockQueryBuilder(mockFeatured);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.getFeatured();

      expect(result).toEqual(mockFeatured);
      expect(queryBuilder.eq).toHaveBeenCalledWith('featured', true);
    });

    it('should fall back to recent listings when no featured available', async () => {
      const mockRecent = [
        { id: '3', title: 'Recent Item 1' },
        { id: '4', title: 'Recent Item 2' },
      ];
      // First call returns empty for featured
      const featuredQueryBuilder = createMockQueryBuilder([]);
      // Second call returns recent listings
      const recentQueryBuilder = createMockQueryBuilder(mockRecent);

      let callCount = 0;
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? featuredQueryBuilder : recentQueryBuilder;
        }),
      } as any);

      const result = await service.getFeatured();

      expect(result).toEqual(mockRecent);
    });
  });

  describe('createFromSubmission', () => {
    it('should create listing from auth_passed submission', async () => {
      const mockSubmission = {
        id: 'sub-1',
        stage: 'auth_passed',
        title: 'Hermes Birkin',
        description: 'Authentic Hermes Birkin 30',
        category: 'bags',
        brand: 'Hermes',
        suggested_price: 50000,
        seller_id: 'seller-1',
      };
      const { id: _subId, ...submissionWithoutId } = mockSubmission;
      const mockListing = { id: 'listing-1', ...submissionWithoutId };

      const subQueryBuilder = createMockQueryBuilder(mockSubmission);
      const insertQueryBuilder = createMockQueryBuilder(mockListing);

      let callCount = 0;
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? subQueryBuilder : insertQueryBuilder;
        }),
      } as any);

      const result = await service.createFromSubmission('sub-1', 'admin-1', {
        price: 50000,
        photos: ['photo1.jpg'],
      });

      expect(result).toBeDefined();
    });

    it('should throw when submission is not in correct stage', async () => {
      const mockSubmission = {
        id: 'sub-1',
        stage: 'pending_review',
        title: 'Some Item',
      };
      const queryBuilder = createMockQueryBuilder(mockSubmission);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      await expect(
        service.createFromSubmission('sub-1', 'admin-1', {
          price: 1000,
          photos: [],
        }),
      ).rejects.toThrow();
    });
  });

  describe('toggleSave', () => {
    it('should save item when not already saved (inserts)', async () => {
      // First query checks if saved - returns null (not found)
      const checkQueryBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
      // Second query inserts the saved item
      const insertQueryBuilder = createMockQueryBuilder({ id: 'save-1', user_id: 'user-1', listing_id: 'listing-1' });

      let callCount = 0;
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? checkQueryBuilder : insertQueryBuilder;
        }),
      } as any);

      const result = await service.toggleSave('user-1', 'listing-1');

      expect(result).toHaveProperty('saved', true);
    });

    it('should unsave item when already saved (deletes existing)', async () => {
      // First query checks if saved - returns existing record
      const checkQueryBuilder = createMockQueryBuilder({ id: 'save-1', user_id: 'user-1', listing_id: 'listing-1' });
      // Second query deletes the saved item
      const deleteQueryBuilder = createMockQueryBuilder(null);

      let callCount = 0;
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? checkQueryBuilder : deleteQueryBuilder;
        }),
      } as any);

      const result = await service.toggleSave('user-1', 'listing-1');

      expect(result).toHaveProperty('saved', false);
    });
  });
});
