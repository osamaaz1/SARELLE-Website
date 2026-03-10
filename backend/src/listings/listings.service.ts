import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ListingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async browse(params: {
    search?: string;
    category?: string;
    brand?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const client = this.supabase.getClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let query = client
      .from('wimc_listings')
      .select('id, name, brand, price, category, status, photos, celebrity_id, listing_type, condition, original_price, created_at, seller_id, wimc_profiles!wimc_listings_seller_id_fkey(display_name, avatar_url)', { count: 'exact' })
      .eq('status', 'published');

    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,brand.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }
    if (params.category && params.category !== 'All') query = query.eq('category', params.category);
    if (params.brand) query = query.eq('brand', params.brand);
    if (params.condition) query = query.eq('condition', params.condition);
    if (params.minPrice) query = query.gte('price', params.minPrice);
    if (params.maxPrice) query = query.lte('price', params.maxPrice);

    switch (params.sort) {
      case 'price_asc': query = query.order('price', { ascending: true }); break;
      case 'price_desc': query = query.order('price', { ascending: false }); break;
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      default: query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw new BadRequestException(error.message);

    return {
      listings: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async getById(id: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('wimc_listings')
      .select('*, wimc_profiles!wimc_listings_seller_id_fkey(id, display_name, avatar_url, tier)')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Listing not found');
    return data;
  }

  async getFeatured() {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_listings')
      .select('id, name, brand, price, category, status, photos, celebrity_id, listing_type, condition, original_price, created_at, seller_id, wimc_profiles!wimc_listings_seller_id_fkey(display_name, avatar_url)')
      .eq('status', 'published')
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(8);
    return data || [];
  }

  async getCelebrityListings() {
    const client = this.supabase.getClient();
    const { data: celebrities } = await client
      .from('wimc_celebrities')
      .select('id, name, bio, followers, avatar_url, user_id, verified, created_at')
      .eq('verified', true)
      .order('followers', { ascending: false });

    if (!celebrities?.length) return [];

    // Single query for all celebrity listings instead of N+1
    const celebIds = celebrities.map(c => c.id);
    const { data: allListings } = await client
      .from('wimc_listings')
      .select('id, name, brand, price, category, status, photos, celebrity_id, listing_type, condition, original_price, created_at')
      .in('celebrity_id', celebIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    // Group listings by celebrity_id
    const listingsByCeleb = new Map<string, any[]>();
    for (const listing of allListings || []) {
      const existing = listingsByCeleb.get(listing.celebrity_id) || [];
      listingsByCeleb.set(listing.celebrity_id, [...existing, listing]);
    }

    return celebrities.map(celeb => {
      const celebListings = listingsByCeleb.get(celeb.id) || [];
      return {
        ...celeb,
        listings: celebListings.slice(0, 4),
        totalItems: celebListings.length,
      };
    });
  }

  async createFromSubmission(submissionId: string, adminId: string, data: {
    photos: string[];
    description?: string;
    price: number;
    featured?: boolean;
  }) {
    const client = this.supabase.getClient();

    const { data: submission, error: subError } = await client
      .from('wimc_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();
    if (subError || !submission) throw new NotFoundException('Submission not found');
    if (!['auth_passed', 'photoshoot_done'].includes(submission.stage)) {
      throw new BadRequestException('Submission not ready for listing');
    }

    const { data: listing, error } = await client
      .from('wimc_listings')
      .insert({
        submission_id: submissionId,
        seller_id: submission.seller_id,
        brand: submission.brand,
        name: submission.name,
        category: submission.category,
        condition: submission.condition,
        price: data.price,
        original_price: submission.proposed_price,
        description: data.description || submission.pro_description || submission.description,
        photos: data.photos,
        status: 'published',
        featured: data.featured || false,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    await client
      .from('wimc_submissions')
      .update({ stage: 'listed', final_price: data.price, updated_at: new Date().toISOString() })
      .eq('id', submissionId);

    return listing;
  }

  async updateStatus(id: string, status: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('wimc_listings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async toggleSave(userId: string, listingId: string) {
    const client = this.supabase.getClient();
    const { data: existing } = await client
      .from('wimc_saved_items')
      .select('user_id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();

    if (existing) {
      await client.from('wimc_saved_items').delete().eq('user_id', userId).eq('listing_id', listingId);
      return { saved: false };
    } else {
      // Use try/catch to handle race condition (concurrent save clicks causing duplicate insert)
      try {
        await client.from('wimc_saved_items').insert({ user_id: userId, listing_id: listingId });
        return { saved: true };
      } catch {
        // Duplicate — another concurrent request already inserted; treat as already saved
        return { saved: true };
      }
    }
  }

  async getSaved(userId: string) {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('wimc_saved_items')
      .select('listing_id, wimc_listings(*)')
      .eq('user_id', userId);
    return (data || []).map((s: any) => s.wimc_listings).filter(Boolean);
  }
}
