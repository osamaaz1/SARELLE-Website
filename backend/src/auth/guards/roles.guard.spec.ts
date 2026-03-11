import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (user: any = null): ExecutionContext => {
    const mockRequest = { user };
    const mockHandler = jest.fn();
    const mockClass = jest.fn();
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access when no @Roles decorator is applied', () => {
    (reflector.get as jest.Mock).mockReturnValue(undefined);

    const context = createMockExecutionContext();
    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when user role matches a required role', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin', 'seller']);

    const user = { id: 'user-123', role: 'admin', email: 'admin@example.com' };
    const context = createMockExecutionContext(user);
    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user role does not match required roles', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin']);

    const user = { id: 'user-123', role: 'buyer', email: 'buyer@example.com' };
    const context = createMockExecutionContext(user);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when no user is on the request', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin', 'seller']);

    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
