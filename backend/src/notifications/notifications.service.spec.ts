import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { SupabaseService } from '../supabase/supabase.service';
import { WimcGateway } from '../gateway/wimc.gateway';
import { createMockSupabaseService, createMockQueryBuilder } from '../test-utils/mock-supabase';
import { createMockGateway } from '../test-utils/mock-services';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let wimcGateway: jest.Mocked<WimcGateway>;

  beforeEach(async () => {
    supabaseService = createMockSupabaseService() as any;
    wimcGateway = createMockGateway() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: WimcGateway, useValue: wimcGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert notification and emit via websocket', async () => {
      const notificationData = {
        type: 'submission_update',
        title: 'Submission Approved',
        message: 'Your item has been approved for listing.',
      };
      const mockNotification = { id: 'notif-1', user_id: 'user-1', ...notificationData, read: false, created_at: new Date().toISOString() };
      const queryBuilder = createMockQueryBuilder(mockNotification);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.create('user-1', notificationData);

      expect(result).toEqual(mockNotification);
      expect(wimcGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'notification',
        expect.objectContaining({ id: 'notif-1' }),
      );
    });

    it('should handle insert error gracefully without throwing', async () => {
      const notificationData = {
        type: 'submission_update',
        title: 'Test',
        message: 'Test message',
      };
      const queryBuilder = createMockQueryBuilder(null, { code: '23505', message: 'Insert failed' });
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      // Should not throw - logs instead
      const loggerSpy = jest.spyOn(service['logger'] || console, 'error').mockImplementation();

      await expect(service.create('user-1', notificationData)).resolves.not.toThrow();

      loggerSpy.mockRestore();
    });
  });

  describe('listByUser', () => {
    it('should return paginated notifications for a user', async () => {
      const mockNotifications = [
        { id: 'notif-1', user_id: 'user-1', title: 'Update 1', read: false },
        { id: 'notif-2', user_id: 'user-1', title: 'Update 2', read: true },
        { id: 'notif-3', user_id: 'user-1', title: 'Update 3', read: false },
      ];
      const queryBuilder = createMockQueryBuilder(mockNotifications, null, 3);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.listByUser('user-1', 1, 10);

      expect(result.notifications).toEqual(mockNotifications);
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('markRead', () => {
    it('should update the read flag for a notification', async () => {
      const queryBuilder = createMockQueryBuilder(null);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      // markRead returns void (no return value)
      await service.markRead('notif-1', 'user-1');

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ read: true }),
      );
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'notif-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      const queryBuilder = createMockQueryBuilder(null);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      await service.markAllRead('user-1');

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ read: true }),
      );
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('read', false);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const queryBuilder = createMockQueryBuilder(null, null, 7);
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(queryBuilder),
      } as any);

      const result = await service.getUnreadCount('user-1');

      // getUnreadCount returns { count: number }
      expect(result).toEqual({ count: 7 });
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('read', false);
    });
  });
});
