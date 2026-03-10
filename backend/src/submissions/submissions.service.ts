import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { WimcGateway } from '../gateway/wimc.gateway';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly emailService: EmailService,
    private readonly gateway: WimcGateway,
  ) {}

  /**
   * Auto-upgrades a buyer to seller and creates seller_profile if needed.
   * This allows any registered user to submit items without pre-selecting a role.
   */
  async ensureSellerProfile(userId: string) {
    const client = this.supabase.getClient();

    // Check current role
    const { data: profile } = await client
      .from('wimc_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile) throw new BadRequestException('Profile not found');

    // Already a seller or vip_seller — nothing to do
    if (profile.role === 'seller' || profile.role === 'vip_seller' || profile.role === 'admin') return;

    // Upgrade buyer → seller
    await client
      .from('wimc_profiles')
      .update({ role: 'seller' })
      .eq('id', userId);

    // Create seller profile row if missing
    const { data: existing } = await client
      .from('wimc_seller_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!existing) {
      await client.from('wimc_seller_profiles').insert({ user_id: userId });
    }

    this.logger.log(`User ${userId} auto-upgraded to seller`);
  }

  async create(sellerId: string, data: {
    brand: string;
    name: string;
    category: string;
    condition: string;
    color?: string;
    description: string;
    user_photos: string[];
  }) {
    const client = this.supabase.getClient();
    const { data: submission, error } = await client
      .from('wimc_submissions')
      .insert({
        seller_id: sellerId,
        ...data,
        stage: 'pending_review',
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    await this.addEvent(submission.id, sellerId, 'Submission created', null, 'pending_review');

    // Send email notification to seller
    this.getEmailForUser(sellerId).then(email => {
      if (email) this.emailService.sendSubmissionReceived(email, data.name);
    }).catch(e => this.logger.error('Email error', e));

    // Real-time: notify admin of new submission
    this.gateway.emitToAdmin('submission:new', submission);

    return submission;
  }

  async listBySeller(sellerId: string, stage?: string) {
    const client = this.supabase.getClient();
    let query = client
      .from('wimc_submissions')
      .select('id, seller_id, brand, name, category, condition, color, stage, proposed_price, final_price, created_at, updated_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (stage) query = query.eq('stage', stage);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async listAll(stage?: string) {
    const client = this.supabase.getClient();
    let query = client
      .from('wimc_submissions')
      .select('id, seller_id, brand, name, category, condition, color, stage, proposed_price, final_price, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (stage) query = query.eq('stage', stage);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getById(id: string, userId?: string, isAdmin = false) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('wimc_submissions')
      .select('*, wimc_submission_events(*)')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Submission not found');
    if (!isAdmin && userId && data.seller_id !== userId) {
      throw new ForbiddenException('Not your submission');
    }
    return data;
  }

  async acceptPrice(id: string, sellerId: string) {
    const submission = await this.getById(id, sellerId);
    if (submission.stage !== 'price_suggested') {
      throw new BadRequestException('No price to accept');
    }
    const result = await this.updateStage(id, sellerId, 'price_suggested', 'price_accepted', 'Seller accepted proposed price');

    // Notify admins
    this.getAdminEmails().then(emails => {
      emails.forEach(email => this.emailService.sendPriceResponse(email, submission.name, true));
    }).catch(e => this.logger.error('Email error', e));

    return result;
  }

  async rejectPrice(id: string, sellerId: string) {
    const submission = await this.getById(id, sellerId);
    if (submission.stage !== 'price_suggested') {
      throw new BadRequestException('No price to reject');
    }
    const result = await this.updateStage(id, sellerId, 'price_suggested', 'price_rejected', 'Seller rejected proposed price');

    // Notify admins
    this.getAdminEmails().then(emails => {
      emails.forEach(email => this.emailService.sendPriceResponse(email, submission.name, false));
    }).catch(e => this.logger.error('Email error', e));

    return result;
  }

  async adminReview(id: string, adminId: string, action: 'approve' | 'reject', data: {
    proposed_price?: number;
    rejection_reason?: string;
    admin_notes?: string;
  }) {
    const client = this.supabase.getClient();
    const submission = await this.getById(id, undefined, true);

    if (submission.stage !== 'pending_review') {
      throw new BadRequestException('Submission not in pending_review stage');
    }

    if (action === 'approve') {
      if (!data.proposed_price) throw new BadRequestException('Price required for approval');
      const { error } = await client
        .from('wimc_submissions')
        .update({
          stage: 'price_suggested',
          proposed_price: data.proposed_price,
          admin_notes: data.admin_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw new BadRequestException(error.message);
      await this.addEvent(id, adminId, `Price proposed: $${data.proposed_price}`, submission.stage, 'price_suggested');

      // Notify seller of price suggestion
      this.getEmailForUser(submission.seller_id).then(email => {
        if (email) this.emailService.sendPriceSuggested(email, submission.name, data.proposed_price!);
      }).catch(e => this.logger.error('Email error', e));
    } else {
      const { error } = await client
        .from('wimc_submissions')
        .update({
          stage: 'rejected',
          rejection_reason: data.rejection_reason,
          admin_notes: data.admin_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw new BadRequestException(error.message);
      await this.addEvent(id, adminId, `Rejected: ${data.rejection_reason}`, submission.stage, 'rejected');
    }

    return this.getById(id, undefined, true);
  }

  async schedulePickup(id: string, adminId: string, data: {
    pickup_date: string;
    pickup_time: string;
    pickup_address: string;
    driver_phone: string;
    google_maps_link?: string;
  }) {
    const client = this.supabase.getClient();
    const { error } = await client
      .from('wimc_submissions')
      .update({
        ...data,
        stage: 'pickup_scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    await this.addEvent(id, adminId, 'Pickup scheduled', 'price_accepted', 'pickup_scheduled');
    return this.getById(id, undefined, true);
  }

  async dispatchDriver(id: string, adminId: string) {
    return this.updateStage(id, adminId, 'pickup_scheduled', 'driver_dispatched', 'Driver dispatched');
  }

  async arrivedAtOffice(id: string, adminId: string) {
    return this.updateStage(id, adminId, 'driver_dispatched', 'arrived_at_office', 'Item arrived at office');
  }

  async qcResult(id: string, adminId: string, passed: boolean, notes?: string) {
    const submission = await this.getById(id, undefined, true);
    const newStage = passed ? 'auth_passed' : 'auth_failed';
    const message = passed ? 'Authentication passed' : `Authentication failed: ${notes || 'No reason given'}`;
    const result = await this.updateStage(id, adminId, 'arrived_at_office', newStage, message);

    if (!passed) {
      this.getEmailForUser(submission.seller_id).then(email => {
        if (email) this.emailService.sendAuthFailed(email, submission.name, notes);
      }).catch(e => this.logger.error('Email error', e));
    }

    return result;
  }

  async photoshootDone(id: string, adminId: string, proPhotos: string[], proDescription?: string) {
    const client = this.supabase.getClient();
    const { error } = await client
      .from('wimc_submissions')
      .update({
        pro_photos: proPhotos,
        pro_description: proDescription,
        stage: 'photoshoot_done',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
    await this.addEvent(id, adminId, 'Professional photoshoot completed', 'auth_passed', 'photoshoot_done');
    return this.getById(id, undefined, true);
  }

  private async updateStage(id: string, actorId: string, expectedStage: string, newStage: string, message: string) {
    const client = this.supabase.getClient();
    const submission = await this.getById(id, undefined, true);

    if (submission.stage !== expectedStage) {
      throw new BadRequestException(`Expected stage ${expectedStage}, got ${submission.stage}`);
    }

    const { error } = await client
      .from('wimc_submissions')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);

    await this.addEvent(id, actorId, message, expectedStage, newStage);
    const updated = await this.getById(id, undefined, true);

    // Real-time: notify seller + admin of stage change
    this.gateway.emitToUser(submission.seller_id, 'submission:stage-changed', { id, stage: newStage });
    this.gateway.emitToAdmin('submission:stage-changed', { id, stage: newStage });

    return updated;
  }

  private async addEvent(submissionId: string, actorId: string, message: string, oldStage: string | null, newStage: string) {
    const client = this.supabase.getClient();
    const { error } = await client.from('wimc_submission_events').insert({
      submission_id: submissionId,
      actor_id: actorId,
      message,
      old_stage: oldStage,
      new_stage: newStage,
    });
    if (error) this.logger.error('Failed to add submission event', error);
  }

  private async getEmailForUser(userId: string): Promise<string | null> {
    const client = this.supabase.getClient();
    const { data } = await client.auth.admin.getUserById(userId);
    return data?.user?.email || null;
  }

  private async getAdminEmails(): Promise<string[]> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_profiles')
      .select('id')
      .eq('role', 'admin');
    if (!data?.length) return [];
    const emailResults = await Promise.all(data.map(admin => this.getEmailForUser(admin.id)));
    return emailResults.filter(Boolean) as string[];
  }
}
