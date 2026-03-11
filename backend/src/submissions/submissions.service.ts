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
   * Ensures a seller_profile row exists for the user so they can submit items.
   * Any customer can sell — no role change is needed.
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

    // Already has a role that can sell — nothing to upgrade
    if (profile.role === 'admin' || profile.role === 'celebrity') return;

    // Customer role stays as customer — seller profile is what matters

    // Create seller profile row if missing
    const { data: existing } = await client
      .from('wimc_seller_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!existing) {
      await client.from('wimc_seller_profiles').insert({ user_id: userId });
    }

    this.logger.log(`Seller profile created for user ${userId}`);
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
      .select('id, seller_id, brand, name, category, condition, color, stage, proposed_price, final_price, user_photos, created_at, updated_at')
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
      .select('id, seller_id, brand, name, category, condition, color, stage, proposed_price, final_price, user_photos, pickup_date, pickup_time_from, pickup_time_to, pickup_address, driver_phone, whatsapp_number, google_maps_link, admin_suggested_date, admin_suggested_time_from, admin_suggested_time_to, admin_pickup_notes, created_at, updated_at, wimc_profiles!seller_id(display_name)')
      .order('created_at', { ascending: false });

    if (stage) query = query.eq('stage', stage);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    // Flatten the joined profile data
    return (data || []).map((item: any) => ({
      ...item,
      seller_name: item.wimc_profiles?.display_name || null,
      wimc_profiles: undefined,
    }));
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
    if (action === 'approve') {
      if (!data.proposed_price) throw new BadRequestException('Price required for approval');
      const result = await this.updateStage(
        id, adminId, 'pending_review', 'price_suggested',
        `Price proposed: $${data.proposed_price}`,
        { proposed_price: data.proposed_price, admin_notes: data.admin_notes },
      );

      // Notify seller of price suggestion
      const submission = await this.getById(id, undefined, true);
      this.getEmailForUser(submission.seller_id).then(email => {
        if (email) this.emailService.sendPriceSuggested(email, submission.name, data.proposed_price!);
      }).catch(e => this.logger.error('Email error', e));

      return result;
    } else {
      return this.updateStage(
        id, adminId, 'pending_review', 'rejected',
        `Rejected: ${data.rejection_reason}`,
        { rejection_reason: data.rejection_reason, admin_notes: data.admin_notes },
      );
    }
  }

  async proposePickup(id: string, sellerId: string, data: {
    pickup_date: string;
    pickup_time_from: string;
    pickup_time_to: string;
    pickup_address: string;
    driver_phone: string;
    whatsapp_number: string;
    google_maps_link?: string;
  }) {
    const submission = await this.getById(id, sellerId);
    if (submission.stage !== 'price_accepted' && submission.stage !== 'pickup_counter') {
      throw new BadRequestException('Cannot propose pickup at this stage');
    }
    return this.updateStage(
      id, sellerId, submission.stage, 'pickup_proposed', 'Customer proposed pickup time',
      {
        pickup_date: data.pickup_date,
        pickup_time_from: data.pickup_time_from,
        pickup_time_to: data.pickup_time_to,
        pickup_address: data.pickup_address,
        driver_phone: data.driver_phone,
        whatsapp_number: data.whatsapp_number,
        google_maps_link: data.google_maps_link || null,
      },
    );
  }

  async respondToPickup(id: string, adminId: string, action: 'accept' | 'reject' | 'cancel', data?: {
    admin_suggested_date?: string;
    admin_suggested_time_from?: string;
    admin_suggested_time_to?: string;
    admin_pickup_notes?: string;
  }) {
    const submission = await this.getById(id, undefined, true);

    if (action === 'accept') {
      if (submission.stage !== 'pickup_proposed') {
        throw new BadRequestException('No pickup proposal to accept');
      }
      return this.updateStage(id, adminId, 'pickup_proposed', 'pickup_confirmed', 'Admin confirmed pickup');
    }

    if (action === 'reject') {
      if (submission.stage !== 'pickup_proposed') {
        throw new BadRequestException('No pickup proposal to reject');
      }
      if (!data?.admin_suggested_date || !data?.admin_suggested_time_from || !data?.admin_suggested_time_to) {
        throw new BadRequestException('Must suggest an alternative date and time range');
      }
      return this.updateStage(
        id, adminId, 'pickup_proposed', 'pickup_counter',
        `Admin suggested different time: ${data.admin_suggested_date} ${data.admin_suggested_time_from}-${data.admin_suggested_time_to}`,
        {
          admin_suggested_date: data.admin_suggested_date,
          admin_suggested_time_from: data.admin_suggested_time_from,
          admin_suggested_time_to: data.admin_suggested_time_to,
          admin_pickup_notes: data.admin_pickup_notes || null,
        },
      );
    }

    if (action === 'cancel') {
      if (submission.stage !== 'pickup_proposed' && submission.stage !== 'pickup_counter') {
        throw new BadRequestException('No active pickup negotiation to cancel');
      }
      return this.updateStage(id, adminId, submission.stage, 'pickup_cancelled', 'Pickup cancelled by admin');
    }

    throw new BadRequestException('Invalid action');
  }

  async acceptAdminPickupTime(id: string, sellerId: string) {
    const submission = await this.getById(id, sellerId);
    if (submission.stage !== 'pickup_counter') {
      throw new BadRequestException('No admin suggestion to accept');
    }
    return this.updateStage(
      id, sellerId, 'pickup_counter', 'pickup_confirmed', 'Customer accepted admin suggested time',
      {
        pickup_date: submission.admin_suggested_date,
        pickup_time_from: submission.admin_suggested_time_from,
        pickup_time_to: submission.admin_suggested_time_to,
      },
    );
  }

  async counterPickup(id: string, sellerId: string, data: {
    pickup_date: string;
    pickup_time_from: string;
    pickup_time_to: string;
    pickup_address: string;
    driver_phone: string;
    whatsapp_number: string;
    google_maps_link?: string;
  }) {
    const submission = await this.getById(id, sellerId);
    if (submission.stage !== 'pickup_counter') {
      throw new BadRequestException('Cannot counter-propose at this stage');
    }
    return this.updateStage(
      id, sellerId, 'pickup_counter', 'pickup_proposed', 'Customer counter-proposed new pickup time',
      {
        pickup_date: data.pickup_date,
        pickup_time_from: data.pickup_time_from,
        pickup_time_to: data.pickup_time_to,
        pickup_address: data.pickup_address,
        driver_phone: data.driver_phone,
        whatsapp_number: data.whatsapp_number,
        google_maps_link: data.google_maps_link || null,
      },
    );
  }

  async dispatchDriver(id: string, adminId: string) {
    return this.updateStage(id, adminId, 'pickup_confirmed', 'driver_dispatched', 'Driver dispatched');
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
    return this.updateStage(
      id, adminId, 'auth_passed', 'photoshoot_done', 'Professional photoshoot completed',
      { pro_photos: proPhotos, pro_description: proDescription },
    );
  }

  private async updateStage(
    id: string, actorId: string,
    expectedStage: string, newStage: string, message: string,
    extraFields?: Record<string, any>,
  ) {
    const client = this.supabase.getClient();
    const submission = await this.getById(id, undefined, true);

    if (submission.stage !== expectedStage) {
      throw new BadRequestException(`Expected stage ${expectedStage}, got ${submission.stage}`);
    }

    const { error } = await client
      .from('wimc_submissions')
      .update({ stage: newStage, updated_at: new Date().toISOString(), ...extraFields })
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
