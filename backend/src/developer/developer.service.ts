import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DeveloperService {
  constructor(private readonly supabase: SupabaseService) {}

  async getDashboardStats() {
    const client = this.supabase.getAdminClient();

    const [usersRes, errorsRes, auditRes] = await Promise.all([
      client.from('wimc_profiles').select('role', { count: 'exact' }),
      client.from('wimc_error_log').select('id', { count: 'exact' }),
      client.from('wimc_audit_log').select('id', { count: 'exact' }),
    ]);

    const roleCounts: Record<string, number> = {};
    if (usersRes.data) {
      for (const row of usersRes.data) {
        roleCounts[row.role] = (roleCounts[row.role] || 0) + 1;
      }
    }

    return {
      total_users: usersRes.count || 0,
      users_by_role: roleCounts,
      total_errors: errorsRes.count || 0,
      total_audit_entries: auditRes.count || 0,
      uptime: process.uptime(),
    };
  }

  async getUsers(params: { page?: number; limit?: number; role?: string; search?: string; disabled?: string }) {
    const client = this.supabase.getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let query = client.from('wimc_profiles').select('*', { count: 'exact' });

    if (params.role) {
      query = query.eq('role', params.role);
    }
    if (params.search) {
      query = query.or(`display_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }
    if (params.disabled === 'true') {
      query = query.not('disabled_at', 'is', null);
    } else if (params.disabled === 'false') {
      query = query.is('disabled_at', null);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    return {
      users: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async changeUserRole(userId: string, newRole: string, actorId: string) {
    const client = this.supabase.getAdminClient();
    const validRoles = ['customer', 'celebrity', 'admin', 'developer'];
    if (!validRoles.includes(newRole)) {
      throw new BadRequestException(`Invalid role: ${newRole}`);
    }

    // Get current role for audit
    const { data: current } = await client.from('wimc_profiles').select('role').eq('id', userId).single();
    if (!current) throw new NotFoundException('User not found');

    const { error } = await client.from('wimc_profiles').update({ role: newRole }).eq('id', userId);
    if (error) throw new BadRequestException(error.message);

    // Audit log
    await client.from('wimc_audit_log').insert({
      entity_type: 'user',
      action: 'role_change',
      actor_id: actorId,
      entity_id: userId,
      old_values: { role: current.role },
      new_values: { role: newRole },
    }).then(() => {});

    return { success: true, old_role: current.role, new_role: newRole };
  }

  async toggleUserDisable(userId: string, disable: boolean, actorId: string) {
    const client = this.supabase.getAdminClient();

    const { data: current } = await client.from('wimc_profiles').select('disabled_at, email').eq('id', userId).single();
    if (!current) throw new NotFoundException('User not found');

    const disabledAt = disable ? new Date().toISOString() : null;
    const { error } = await client.from('wimc_profiles').update({ disabled_at: disabledAt }).eq('id', userId);
    if (error) throw new BadRequestException(error.message);

    // Ban/unban in Supabase Auth
    try {
      const adminAuth = this.supabase.getAdminClient().auth.admin;
      if (disable) {
        await adminAuth.updateUserById(userId, { ban_duration: '876000h' }); // ~100 years
      } else {
        await adminAuth.updateUserById(userId, { ban_duration: 'none' });
      }
    } catch {
      // Supabase auth ban is best-effort
    }

    // Audit log
    await client.from('wimc_audit_log').insert({
      entity_type: 'user',
      action: disable ? 'account_disabled' : 'account_enabled',
      actor_id: actorId,
      entity_id: userId,
      old_values: { disabled_at: current.disabled_at },
      new_values: { disabled_at: disabledAt },
    }).then(() => {});

    return { success: true, disabled: disable };
  }

  async getAuditLogs(params: { page?: number; limit?: number; entity_type?: string; action?: string; from?: string; to?: string }) {
    const client = this.supabase.getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 30;
    const offset = (page - 1) * limit;

    let query = client.from('wimc_audit_log').select('*', { count: 'exact' });

    if (params.entity_type) query = query.eq('entity_type', params.entity_type);
    if (params.action) query = query.eq('action', params.action);
    if (params.from) query = query.gte('created_at', params.from);
    if (params.to) query = query.lte('created_at', params.to);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    // Enrich with actor names
    const actorIds = [...new Set((data || []).map(d => d.actor_id).filter(Boolean))];
    let actorMap: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: actors } = await client.from('wimc_profiles').select('id, display_name').in('id', actorIds);
      if (actors) {
        actorMap = Object.fromEntries(actors.map(a => [a.id, a.display_name]));
      }
    }

    return {
      logs: (data || []).map(log => ({
        ...log,
        actor_name: actorMap[log.actor_id] || null,
      })),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getErrorLogs(params: { page?: number; limit?: number; error_type?: string; endpoint?: string; from?: string; to?: string }) {
    const client = this.supabase.getAdminClient();
    const page = params.page || 1;
    const limit = params.limit || 30;
    const offset = (page - 1) * limit;

    let query = client.from('wimc_error_log').select('id, error_type, message, endpoint, http_status, created_at', { count: 'exact' });

    if (params.error_type) query = query.eq('error_type', params.error_type);
    if (params.endpoint) query = query.ilike('endpoint', `%${params.endpoint}%`);
    if (params.from) query = query.gte('created_at', params.from);
    if (params.to) query = query.lte('created_at', params.to);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    return {
      errors: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getErrorLog(id: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.from('wimc_error_log').select('*').eq('id', id).single();
    if (error || !data) throw new NotFoundException('Error log not found');
    return data;
  }

  async getActiveSessions() {
    const client = this.supabase.getAdminClient();
    try {
      const result = await client.auth.admin.listUsers({ page: 1, perPage: 100 });
      const users: any[] = (result.data as any)?.users || [];

      // Get profiles for role info
      const userIds = users.map(u => u.id);
      const { data: profiles } = await client.from('wimc_profiles').select('id, display_name, role').in('id', userIds);
      const profileMap: Record<string, any> = {};
      if (profiles) {
        for (const p of profiles) profileMap[p.id] = p;
      }

      return users
        .filter(u => u.last_sign_in_at)
        .sort((a, b) => new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime())
        .map(u => ({
          id: u.id,
          email: u.email,
          display_name: profileMap[u.id]?.display_name || u.email,
          role: profileMap[u.id]?.role || 'unknown',
          last_sign_in_at: u.last_sign_in_at,
          created_at: u.created_at,
        }));
    } catch {
      return [];
    }
  }

  async forceLogout(userId: string, actorId: string) {
    const client = this.supabase.getAdminClient();

    // Temporary ban + immediate unban to invalidate sessions
    try {
      await client.auth.admin.updateUserById(userId, { ban_duration: '1s' });
      // Wait briefly, then unban
      await new Promise(r => setTimeout(r, 1500));
      await client.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    } catch (err) {
      throw new BadRequestException('Failed to force logout user');
    }

    // Audit log
    await client.from('wimc_audit_log').insert({
      entity_type: 'user',
      action: 'force_logout',
      actor_id: actorId,
      entity_id: userId,
    }).then(() => {});

    return { success: true };
  }

  async getApiOverview() {
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    return {
      cors_origins: corsOrigin.split(',').map(s => s.trim()),
      rate_limit: { ttl_ms: 60000, limit: 60 },
      supabase: {
        url_configured: !!process.env.SUPABASE_URL,
        anon_key_configured: !!process.env.SUPABASE_ANON_KEY,
        service_key_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      commission_rates: {
        bronze: Number(process.env.COMMISSION_BRONZE) || 20,
        silver: Number(process.env.COMMISSION_SILVER) || 18,
        gold: Number(process.env.COMMISSION_GOLD) || 15,
        platinum: Number(process.env.COMMISSION_PLATINUM) || 12,
      },
      uptime_seconds: process.uptime(),
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
