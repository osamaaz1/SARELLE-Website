import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createMockSupabaseService, createMockQueryBuilder } from '../test-utils/mock-supabase';

describe('UsersService', () => {
  let service: UsersService;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return profile with seller_profiles joined', async () => {
      const mockProfile = {
        id: 'user-1',
        full_name: 'Dina Bahgat',
        email: 'dina@wimc.com',
        role: 'seller',
        wimc_seller_profiles: {
          tier: 'gold',
          points: 1800,
          commission_rate: 15,
        },
      };
      const queryBuilder = createMockQueryBuilder(mockProfile);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(mockProfile);
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'user-1');
      expect(queryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('wimc_seller_profiles'),
      );
    });

    it('should throw NotFoundException when profile not found', async () => {
      const queryBuilder = createMockQueryBuilder(null, {
        code: 'PGRST116',
        message: 'Row not found',
      });
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      await expect(service.getProfile('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update and return the updated profile', async () => {
      const updatedProfile = {
        id: 'user-1',
        full_name: 'Dina B.',
        phone: '+201234567890',
        email: 'dina@wimc.com',
        role: 'seller',
      };
      const queryBuilder = createMockQueryBuilder(updatedProfile);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.updateProfile('user-1', {
        display_name: 'Dina B.',
        phone: '+201234567890',
      });

      expect(result).toEqual(updatedProfile);
      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'Dina B.',
          phone: '+201234567890',
        }),
      );
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  describe('getSellerCloset', () => {
    it('should return seller profile with their listings', async () => {
      const mockSeller = {
        id: 'seller-1',
        full_name: 'Top Seller',
        role: 'seller',
      };
      const mockListings = [
        { id: 'listing-1', title: 'Gucci Bag', price: 5000, seller_id: 'seller-1' },
        { id: 'listing-2', title: 'Prada Shoes', price: 3000, seller_id: 'seller-1' },
      ];

      const sellerQueryBuilder = createMockQueryBuilder(mockSeller);
      const listingsQueryBuilder = createMockQueryBuilder(mockListings);

      let callCount = 0;
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? sellerQueryBuilder : listingsQueryBuilder;
        }),
      } as any);

      const result = await service.getSellerCloset('seller-1');

      expect(result).toHaveProperty('seller');
      expect(result).toHaveProperty('listings');
      expect(result.seller).toEqual(mockSeller);
      expect(result.listings).toEqual(mockListings);
    });
  });
});
