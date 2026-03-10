import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WimcGateway } from '../gateway/wimc.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gateway: WimcGateway,
  ) {}

  async create(userId: string, data: {
    type: string;
    title: string;
    message: string;
    action_url?: string;
    metadata?: Record<string, any>;
  }) {
    const client = this.supabase.getClient();
    const { data: notification, error } = await client
      .from('wimc_notifications')
      .insert({ user_id: userId, ...data, read: false })
      .select()
      .single();
    if (error) this.logger.error('Notification insert failed', error);

    // Push notification via WebSocket in real-time
    if (notification) {
      try {
        this.gateway.emitToUser(userId, 'notification', notification);
      } catch (e) {
        this.logger.error('WebSocket emit error', e);
      }
    }

    return notification;
  }

  async listByUser(userId: string, page = 1, limit = 20) {
    const client = this.supabase.getClient();
    const offset = (page - 1) * limit;
    const { data, count } = await client
      .from('wimc_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { notifications: data || [], total: count || 0, page, totalPages: Math.ceil((count || 0) / limit) };
  }

  async markRead(id: string, userId: string) {
    const client = this.supabase.getClient();
    await client
      .from('wimc_notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
  }

  async markAllRead(userId: string) {
    const client = this.supabase.getClient();
    await client
      .from('wimc_notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
  }

  async getUnreadCount(userId: string) {
    const client = this.supabase.getClient();
    const { count } = await client
      .from('wimc_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    return { count: count || 0 };
  }
}
