import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async register(email: string, password: string, role: 'buyer' | 'seller', displayName: string) {
    const admin = this.supabase.getClient();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw new BadRequestException(authError.message);

    const { error: profileError } = await admin.from('wimc_profiles').insert({
      id: authData.user.id,
      display_name: displayName,
      role,
      points: 0,
      tier: 'Bronze',
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      throw new BadRequestException('Failed to create profile');
    }

    if (role === 'seller') {
      await admin.from('wimc_seller_profiles').insert({ user_id: authData.user.id });
    }

    // Use anon client to get a real user session
    const anon = this.supabase.getAnonClient();
    const { data: session, error: loginError } = await anon.auth.signInWithPassword({ email, password });
    if (loginError) throw new BadRequestException(loginError.message);

    return { user: authData.user, session: session.session };
  }

  async login(email: string, password: string) {
    // Must use anon client — service role key cannot create user sessions
    const anon = this.supabase.getAnonClient();
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error) throw new UnauthorizedException(error.message);
    return { user: data.user, session: data.session };
  }

  async getProfile(userId: string) {
    const admin = this.supabase.getClient();
    const { data, error } = await admin
      .from('wimc_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) throw new UnauthorizedException('Profile not found');
    return data;
  }

  async validateToken(token: string) {
    const admin = this.supabase.getClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Invalid token');
    return data.user;
  }
}
