import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createMockSupabaseService } from '../test-utils/mock-supabase';

describe('AuthService', () => {
  let service: AuthService;
  let supabaseService: ReturnType<typeof createMockSupabaseService>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const email = 'test@example.com';
    const password = 'Password123';
    const role = 'customer' as const;
    const displayName = 'Test User';
    const mockUser = { id: 'user-123', email };
    const mockSession = { access_token: 'token-abc', refresh_token: 'refresh-xyz' };

    it('should create auth user and profile, then return user and session', async () => {
      const adminClient = supabaseService.getClient();
      adminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      adminClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const anonClient = supabaseService.getAnonClient();
      anonClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await service.register(email, password, role, displayName);

      expect(adminClient.auth.admin.createUser).toHaveBeenCalledWith({
        email,
        password,
        email_confirm: true,
      });
      expect(adminClient.from).toHaveBeenCalledWith('wimc_profiles');
      expect(result).toEqual({ user: mockUser, session: mockSession });
    });

    it('should register with customer role', async () => {
      const adminClient = supabaseService.getClient();
      adminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });
      adminClient.from.mockReturnValue({ insert: insertMock });

      const anonClient = supabaseService.getAnonClient();
      anonClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await service.register(email, password, 'customer', displayName);

      const fromCalls = adminClient.from.mock.calls.map((c: any[]) => c[0]);
      expect(fromCalls).toContain('wimc_profiles');
    });

    it('should roll back (delete user) when profile insert fails', async () => {
      const adminClient = supabaseService.getClient();
      adminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      adminClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      });
      adminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });

      await expect(
        service.register(email, password, role, displayName),
      ).rejects.toThrow(BadRequestException);

      expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw BadRequestException when auth user creation fails', async () => {
      const adminClient = supabaseService.getClient();
      adminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' },
      });

      await expect(
        service.register(email, password, role, displayName),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when login fails after user creation', async () => {
      const adminClient = supabaseService.getClient();
      adminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      adminClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const anonClient = supabaseService.getAnonClient();
      anonClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Login failed after registration' },
      });

      await expect(
        service.register(email, password, role, displayName),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'Password123';
    const mockUser = { id: 'user-123', email };
    const mockSession = { access_token: 'token-abc' };

    it('should return user and session on successful login', async () => {
      const anonClient = supabaseService.getAnonClient();
      anonClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await service.login(email, password);

      expect(anonClient.auth.signInWithPassword).toHaveBeenCalledWith({ email, password });
      expect(result).toEqual({ user: mockUser, session: mockSession });
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const anonClient = supabaseService.getAnonClient();
      anonClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    const userId = 'user-123';
    const mockProfile = {
      id: userId,
      display_name: 'Test User',
      role: 'customer',
      points: 0,
      tier: 'Bronze',
    };

    it('should return profile data for a valid user', async () => {
      const adminClient = supabaseService.getClient();
      adminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      });

      const result = await service.getProfile(userId);

      expect(adminClient.from).toHaveBeenCalledWith('wimc_profiles');
      expect(result).toEqual(mockProfile);
    });

    it('should throw UnauthorizedException when profile is not found', async () => {
      const adminClient = supabaseService.getClient();
      adminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      await expect(service.getProfile(userId)).rejects.toThrow(UnauthorizedException);
    });
  });
});
