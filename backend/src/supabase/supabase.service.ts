import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private adminClient: SupabaseClient;
  private anonClient: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !serviceKey || !anonKey) {
      throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY');
    }

    this.adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.anonClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /** Service-role client — bypasses RLS, for admin DB operations */
  getClient(): SupabaseClient {
    return this.adminClient;
  }

  /** Same as getClient() — kept for compatibility */
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /** Anon-key client — for user-facing auth operations (signIn, signUp) */
  getAnonClient(): SupabaseClient {
    return this.anonClient;
  }
}
