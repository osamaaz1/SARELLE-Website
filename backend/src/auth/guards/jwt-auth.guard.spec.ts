import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from '../auth.service';
import { createMockAuthService } from '../../test-utils/mock-services';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let authService: ReturnType<typeof createMockAuthService>;

  const createMockExecutionContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const mockRequest = { headers, user: null as any };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    authService = createMockAuthService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true and set request.user for a valid token', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockProfile = { id: 'user-123', display_name: 'Test User', role: 'buyer', tier: 'Bronze' };

    authService.validateToken.mockResolvedValue(mockUser);
    authService.getProfile.mockResolvedValue(mockProfile);

    const context = createMockExecutionContext({ authorization: 'Bearer valid-token' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
    expect(authService.getProfile).toHaveBeenCalledWith('user-123');

    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({ ...mockUser, ...mockProfile });
  });

  it('should throw UnauthorizedException when no Authorization header is present', async () => {
    const context = createMockExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when Authorization header lacks Bearer prefix', async () => {
    const context = createMockExecutionContext({ authorization: 'Basic some-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when validateToken rejects', async () => {
    authService.validateToken.mockRejectedValue(new UnauthorizedException('Invalid token'));

    const context = createMockExecutionContext({ authorization: 'Bearer invalid-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(authService.validateToken).toHaveBeenCalledWith('invalid-token');
  });

  it('should throw UnauthorizedException when token is valid but profile is not found', async () => {
    const mockUser = { id: 'user-456', email: 'ghost@example.com' };
    authService.validateToken.mockResolvedValue(mockUser);
    authService.getProfile.mockRejectedValue(new UnauthorizedException('Profile not found'));

    const context = createMockExecutionContext({ authorization: 'Bearer valid-but-no-profile' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(authService.validateToken).toHaveBeenCalledWith('valid-but-no-profile');
    expect(authService.getProfile).toHaveBeenCalledWith('user-456');
  });
});
