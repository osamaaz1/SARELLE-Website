// === Enums ===
export type WimcRole = 'buyer' | 'seller' | 'vip_seller' | 'admin';

export type SubmissionStage =
  | 'pending_review' | 'price_suggested' | 'price_accepted' | 'price_rejected'
  | 'pickup_scheduled' | 'driver_dispatched' | 'arrived_at_office'
  | 'auth_passed' | 'auth_failed' | 'photoshoot_done' | 'listed' | 'rejected';

export type ListingStatus = 'published' | 'reserved' | 'sold' | 'delisted';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
export type OrderStatus =
  | 'pending_payment' | 'paid' | 'processing' | 'shipped' | 'delivered'
  | 'inspection_window' | 'completed' | 'cancelled' | 'refunded';
export type PayoutStatus = 'pending' | 'scheduled' | 'processing' | 'sent' | 'failed';

// === Entities ===
export interface Profile {
  id: string;
  display_name: string;
  phone: string | null;
  role: WimcRole;
  avatar_url: string | null;
  points: number;
  tier: string;
  created_at: string;
  updated_at: string;
}

export interface SellerProfile {
  user_id: string;
  address: string | null;
  payout_method: Record<string, any>;
  google_maps_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface VipProfile {
  user_id: string;
  bio: string | null;
  followers: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  seller_id: string;
  brand: string;
  name: string;
  category: string;
  condition: string;
  color: string | null;
  description: string;
  user_photos: string[];
  stage: SubmissionStage;
  proposed_price: number | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  pickup_address: string | null;
  driver_phone: string | null;
  google_maps_link: string | null;
  pro_photos: string[];
  pro_description: string | null;
  final_price: number | null;
  created_at: string;
  updated_at: string;
  wimc_submission_events?: SubmissionEvent[];
}

export interface SubmissionEvent {
  id: string;
  submission_id: string;
  actor_id: string;
  message: string;
  old_stage: SubmissionStage | null;
  new_stage: SubmissionStage;
  created_at: string;
}

export interface Celebrity {
  id: string;
  user_id: string | null;
  name: string;
  bio: string | null;
  followers: string | null;
  avatar_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  submission_id: string | null;
  seller_id: string;
  brand: string;
  name: string;
  category: string;
  condition: string;
  price: number;
  original_price: number | null;
  description: string | null;
  photos: string[];
  status: ListingStatus;
  featured: boolean;
  celebrity_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  wimc_profiles?: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'tier'>;
}

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  amount: number;
  status: OfferStatus;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  wimc_listings?: Pick<Listing, 'id' | 'name' | 'brand' | 'photos' | 'price'>;
  wimc_profiles?: Pick<Profile, 'display_name' | 'avatar_url'>;
}

export interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  item_price: number;
  service_fee: number;
  shipping_fee: number;
  total: number;
  status: OrderStatus;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  inspection_ends_at: string | null;
  shipping_address: Record<string, any>;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  wimc_listings?: Pick<Listing, 'id' | 'name' | 'brand' | 'photos' | 'category'>;
  wimc_order_events?: OrderEvent[];
}

export interface OrderEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string;
  reason: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  order_id: string;
  seller_id: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  status: PayoutStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SavedItem {
  user_id: string;
  listing_id: string;
  created_at: string;
}

// === API Response Types ===
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuthResponse {
  user: any;
  session: any;
}

// === Stage Metadata ===
export interface StageInfo {
  label: string;
  color: string;
  step: number;
}
