import { Test, TestingModule } from '@nestjs/testing';
import { WimcGateway } from './wimc.gateway';
import { AuthService } from '../auth/auth.service';
import { createMockAuthService } from '../test-utils/mock-services';
import { Socket, Server } from 'socket.io';

describe('WimcGateway', () => {
  let gateway: WimcGateway;
  let authService: jest.Mocked<AuthService>;

  const createMockClient = (overrides: Partial<Socket> = {}): Partial<Socket> => ({
    id: 'socket-1',
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
    } as any,
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  });

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as any;

  beforeEach(async () => {
    authService = createMockAuthService() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WimcGateway,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    gateway = module.get<WimcGateway>(WimcGateway);
    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should disconnect client when no token provided', async () => {
      const client = createMockClient({
        handshake: { auth: {}, headers: {} } as any,
      });

      await gateway.handleConnection(client as Socket);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should join user room with valid token', async () => {
      const mockUser = { id: 'user-1', email: 'test@wimc.com' };
      const mockProfile = { role: 'buyer', full_name: 'Test Buyer' };

      authService.validateToken.mockResolvedValue(mockUser as any);
      authService.getProfile.mockResolvedValue(mockProfile as any);

      const client = createMockClient();

      await gateway.handleConnection(client as Socket);

      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.data.user).toEqual(expect.objectContaining({ id: 'user-1' }));
    });

    it('should join admin room when user is admin', async () => {
      const mockUser = { id: 'admin-1', email: 'admin@wimc.com' };
      const mockProfile = { role: 'admin', full_name: 'Admin User' };

      authService.validateToken.mockResolvedValue(mockUser as any);
      authService.getProfile.mockResolvedValue(mockProfile as any);

      const client = createMockClient();

      await gateway.handleConnection(client as Socket);

      expect(client.join).toHaveBeenCalledWith('user:admin-1');
      expect(client.join).toHaveBeenCalledWith('admin');
    });

    it('should join sellers room when user is seller', async () => {
      const mockUser = { id: 'seller-1', email: 'seller@wimc.com' };
      const mockProfile = { role: 'seller', full_name: 'Seller User' };

      authService.validateToken.mockResolvedValue(mockUser as any);
      authService.getProfile.mockResolvedValue(mockProfile as any);

      const client = createMockClient();

      await gateway.handleConnection(client as Socket);

      expect(client.join).toHaveBeenCalledWith('user:seller-1');
      expect(client.join).toHaveBeenCalledWith('sellers');
    });

    it('should disconnect when user exceeds 5-connection limit', async () => {
      const mockUser = { id: 'user-flood', email: 'flood@wimc.com' };
      const mockProfile = { role: 'buyer', full_name: 'Flood User' };

      authService.validateToken.mockResolvedValue(mockUser as any);
      authService.getProfile.mockResolvedValue(mockProfile as any);

      // Simulate 5 existing connections by connecting 5 clients first
      for (let i = 0; i < 5; i++) {
        const existingClient = createMockClient({ id: `socket-existing-${i}` });
        await gateway.handleConnection(existingClient as Socket);
      }

      // 6th connection should be rejected
      const sixthClient = createMockClient({ id: 'socket-6th' });
      await gateway.handleConnection(sixthClient as Socket);

      expect(sixthClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket from tracking map', async () => {
      const mockUser = { id: 'user-dc', email: 'dc@wimc.com' };
      const mockProfile = { role: 'buyer', full_name: 'Disconnect User' };

      authService.validateToken.mockResolvedValue(mockUser as any);
      authService.getProfile.mockResolvedValue(mockProfile as any);

      const client = createMockClient({ id: 'socket-dc' });
      await gateway.handleConnection(client as Socket);

      // Now disconnect
      gateway.handleDisconnect(client as Socket);

      // After disconnect, connecting a new client should work (slot freed)
      const newClient = createMockClient({ id: 'socket-new' });
      await gateway.handleConnection(newClient as Socket);

      expect(newClient.disconnect).not.toHaveBeenCalled();
      expect(newClient.join).toHaveBeenCalledWith('user:user-dc');
    });
  });

  describe('emitToUser', () => {
    it('should emit to the correct user room', () => {
      gateway.emitToUser('user-1', 'notification', { message: 'Hello' });

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', { message: 'Hello' });
    });
  });

  describe('handleAuctionJoin', () => {
    it('should join the auction room', () => {
      const client = createMockClient();

      gateway.handleAuctionJoin(client as Socket, 'auction-123');

      expect(client.join).toHaveBeenCalledWith('auction:auction-123');
    });
  });
});
