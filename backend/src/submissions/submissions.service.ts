import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly supabase: SupabaseService) {}

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
    return submission;
  }

  async listBySeller(sellerId: string, stage?: string) {
    const client = this.supabase.getClient();
    let query = client
      .from('wimc_submissions')
      .select('*')
      .eq('seller_id', sellerId)
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
    return this.updateStage(id, sellerId, 'price_suggested', 'price_accepted', 'Seller accepted proposed price');
  }

  async rejectPrice(id: string, sellerId: string) {
    const submission = await this.getById(id, sellerId);
    if (submission.stage !== 'price_suggested') {
      throw new BadRequestException('No price to reject');
    }
    return this.updateStage(id, sellerId, 'price_suggested', 'price_rejected', 'Seller rejected proposed price');
  }

  async adminReview(id: string, adminId: string, action: 'approve' | 'reject', data: {
    proposed_price?: number;
    rejection_reason?: string;
    admin_notes?: string;
  }) {
    const client = this.supabase.getClient();
    const submission = await this.getById(id, undefined, true);

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
    const newStage = passed ? 'auth_passed' : 'auth_failed';
    const message = passed ? 'Authentication passed' : `Authentication failed: ${notes || 'No reason given'}`;
    return this.updateStage(id, adminId, 'arrived_at_office', newStage, message);
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
    return this.getById(id, undefined, true);
  }

  private async addEvent(submissionId: string, actorId: string, message: string, oldStage: string | null, newStage: string) {
    const client = this.supabase.getClient();
    await client.from('wimc_submission_events').insert({
      submission_id: submissionId,
      actor_id: actorId,
      message,
      old_stage: oldStage,
      new_stage: newStage,
    });
  }
}
