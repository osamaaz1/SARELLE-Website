import { MOCK_LISTINGS, MOCK_CELEBRITIES, MOCK_AUCTIONS } from './mock-data';

function getApiUrl() {
  const env = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  if (typeof window === 'undefined') return env;
  // If env points to localhost but browser is on a different host (e.g. phone via IP),
  // swap localhost with the current hostname so the API is reachable
  if (env.includes('localhost') && window.location.hostname !== 'localhost') {
    return env.replace('localhost', window.location.hostname);
  }
  return env;
}
const API_URL = getApiUrl();
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Mock users for local testing (USE_MOCK=true only)
// Matches credentials from backend/migrations/002_seed_test_data.sql
const MOCK_USERS: Record<string, { password: string; profile: any }> = {
  'admin@whatinmycloset.com': {
    password: 'Admin123!',
    profile: { id: 'mock-user-admin', email: 'admin@whatinmycloset.com', display_name: 'WIMC Admin', role: 'admin', avatar_url: null, points: 0, tier: 'Gold' },
  },
  'sara@test.wimc.com': {
    password: 'Seller123!',
    profile: { id: 'mock-user-seller', email: 'sara@test.wimc.com', display_name: 'Sara Ahmed', role: 'customer', avatar_url: null, points: 1200, tier: 'Silver' },
  },
  'nadia@test.wimc.com': {
    password: 'Seller123!',
    profile: { id: 'mock-user-nadia', email: 'nadia@test.wimc.com', display_name: 'Nadia El-Sayed', role: 'customer', avatar_url: null, points: 350, tier: 'Bronze' },
  },
  'reem@test.wimc.com': {
    password: 'Buyer123!',
    profile: { id: 'mock-user-reem', email: 'reem@test.wimc.com', display_name: 'Reem Mostafa', role: 'customer', avatar_url: null, points: 150, tier: 'Bronze' },
  },
  'yasmine@test.wimc.com': {
    password: 'Celeb123!',
    profile: { id: 'mock-user-celeb', email: 'yasmine@test.wimc.com', display_name: 'Yasmine Sabri', role: 'celebrity', avatar_url: null, points: 6000, tier: 'Platinum' },
  },
  'buyer@test.wimc.com': {
    password: 'Buyer123!',
    profile: { id: 'mock-user-buyer', email: 'buyer@test.wimc.com', display_name: 'Bea Buyer', role: 'customer', avatar_url: null, points: 50, tier: 'Bronze' },
  },
  'dev@whatinmycloset.com': {
    password: 'Dev123!',
    profile: { id: 'mock-user-dev', email: 'dev@whatinmycloset.com', display_name: 'WIMC Developer', role: 'developer', avatar_url: null, points: 0, tier: 'Gold' },
  },
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl + '/api';
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('wimc_token');
    return stored;
  }

  setToken(token: string) {
    localStorage.setItem('wimc_token', token);
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `wimc_token=${token}; path=/; SameSite=Lax; max-age=86400${secure}`;
  }

  clearToken() {
    localStorage.removeItem('wimc_token');
    localStorage.removeItem('wimc_mock_user');
    document.cookie = 'wimc_token=; path=/; max-age=0';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      if (res.status === 401 && token) {
        // Token was set but server rejected it — expired session
        this.clearToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wimc:auth-expired'));
        }
        throw new Error('Session expired');
      }
      if (res.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  // Auth
  async register(data: { email: string; password: string; role: string; displayName: string }) {
    if (USE_MOCK) throw new Error('Registration is disabled in preview mode. Use a test account below.');
    return this.request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  async login(data: { email: string; password: string }) {
    if (USE_MOCK) {
      const entry = MOCK_USERS[data.email.toLowerCase()];
      if (!entry || entry.password !== data.password) throw new Error('Invalid email or password');
      const token = `mock_token_${entry.profile.id}`;
      if (typeof window !== 'undefined') localStorage.setItem('wimc_mock_user', JSON.stringify(entry.profile));
      return { session: { access_token: token }, user: entry.profile };
    }
    return this.request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMe() {
    if (USE_MOCK) {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem('wimc_mock_user');
      if (stored) return JSON.parse(stored);
      throw new Error('Not authenticated');
    }
    return this.request<any>('/auth/me');
  }

  // Users
  async getProfile() {
    return this.request<any>('/users/profile');
  }

  async updateProfile(data: { display_name?: string; phone?: string; avatar_url?: string }) {
    return this.request<any>('/users/profile', { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getCloset(sellerId: string) {
    return this.request<any>(`/users/${sellerId}/closet`);
  }

  // Listings
  async browseListings(params: Record<string, string> = {}) {
    if (USE_MOCK) {
      let results = [...MOCK_LISTINGS];
      if (params.category && params.category !== 'All') results = results.filter(l => l.category === params.category);
      if (params.search) {
        const q = params.search.toLowerCase();
        results = results.filter(l => l.brand.toLowerCase().includes(q) || l.name.toLowerCase().includes(q));
      }
      return { listings: results, total: results.length, page: 1, totalPages: 1 };
    }
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/listings${query ? `?${query}` : ''}`).catch(() => {
      let results = [...MOCK_LISTINGS];
      if (params.category && params.category !== 'All') results = results.filter(l => l.category === params.category);
      return { listings: results, total: results.length, page: 1, totalPages: 1 };
    });
  }

  async getFeaturedListings() {
    if (USE_MOCK) return MOCK_LISTINGS.filter(l => l.featured);
    return this.request<any>('/listings/featured').catch(() => MOCK_LISTINGS.filter(l => l.featured));
  }

  async getCelebrityListings() {
    if (USE_MOCK) return MOCK_CELEBRITIES;
    return this.request<any>('/listings/celebrities').catch(() => MOCK_CELEBRITIES);
  }

  async getListing(id: string) {
    if (USE_MOCK) {
      const item = MOCK_LISTINGS.find(l => l.id === id);
      if (item) return item;
      throw new Error('Listing not found');
    }
    return this.request<any>(`/listings/${id}`).catch(() => {
      const item = MOCK_LISTINGS.find(l => l.id === id);
      if (item) return item;
      throw new Error('Listing not found');
    });
  }

  async toggleSave(listingId: string) {
    return this.request<any>(`/listings/${listingId}/save`, { method: 'POST' });
  }

  async getSavedListings() {
    return this.request<any>('/listings/saved');
  }

  // Submissions
  async createSubmission(data: any) {
    return this.request<any>('/submissions', { method: 'POST', body: JSON.stringify(data) });
  }

  async getSubmissions(stage?: string) {
    const query = stage ? `?stage=${stage}` : '';
    return this.request<any>(`/submissions${query}`);
  }

  async getSubmission(id: string) {
    return this.request<any>(`/submissions/${id}`);
  }

  async acceptPrice(submissionId: string) {
    return this.request<any>(`/submissions/${submissionId}/accept-price`, { method: 'POST' });
  }

  async rejectPrice(submissionId: string) {
    return this.request<any>(`/submissions/${submissionId}/reject-price`, { method: 'POST' });
  }

  async proposePickup(submissionId: string, data: {
    pickup_date: string;
    pickup_time_from: string;
    pickup_time_to: string;
    pickup_address: string;
    driver_phone: string;
    whatsapp_number: string;
    google_maps_link?: string;
  }) {
    return this.request<any>(`/submissions/${submissionId}/propose-pickup`, { method: 'POST', body: JSON.stringify(data) });
  }

  async acceptAdminPickupTime(submissionId: string) {
    return this.request<any>(`/submissions/${submissionId}/accept-admin-time`, { method: 'POST' });
  }

  async counterPickup(submissionId: string, data: {
    pickup_date: string;
    pickup_time_from: string;
    pickup_time_to: string;
    pickup_address: string;
    driver_phone: string;
    whatsapp_number: string;
    google_maps_link?: string;
  }) {
    return this.request<any>(`/submissions/${submissionId}/counter-pickup`, { method: 'POST', body: JSON.stringify(data) });
  }

  // Offers
  async createOffer(data: { listing_id: string; amount: number; idempotency_key: string }) {
    return this.request<any>('/offers', { method: 'POST', body: JSON.stringify(data) });
  }

  async getSentOffers() {
    return this.request<any>('/offers/sent');
  }

  async getReceivedOffers() {
    return this.request<any>('/offers/received');
  }

  async acceptOffer(offerId: string) {
    return this.request<any>(`/offers/${offerId}/accept`, { method: 'PATCH' });
  }

  async rejectOffer(offerId: string) {
    return this.request<any>(`/offers/${offerId}/reject`, { method: 'PATCH' });
  }

  async withdrawOffer(offerId: string) {
    return this.request<any>(`/offers/${offerId}/withdraw`, { method: 'POST' });
  }

  // Bids / Auctions
  async getAuction(listingId: string) {
    if (USE_MOCK) {
      const auction = MOCK_AUCTIONS.find(a => a.listing_id === listingId);
      return auction || null;
    }
    return this.request<any>(`/bids/auction/${listingId}`).catch(() => null);
  }

  async getAuctionHistory(auctionId: string) {
    if (USE_MOCK) {
      const auction = MOCK_AUCTIONS.find(a => a.id === auctionId);
      if (!auction) return [];
      return auction.mock_history || [];
    }
    return this.request<any>(`/bids/auction/${auctionId}/history`).catch(() => []);
  }

  async placeBid(data: { auction_id: string; max_amount: number }) {
    if (USE_MOCK) {
      const auction = MOCK_AUCTIONS.find(a => a.id === data.auction_id);
      if (!auction) throw new Error('Auction not found');
      if (data.max_amount < (auction.current_price || auction.starting_price)) {
        throw new Error('Bid too low');
      }
      return {
        status: 'winning',
        current_price: data.max_amount,
        bid_count: auction.bid_count + 1,
        reserve_met: auction.reserve_met,
        message: "You're the highest bidder!",
      };
    }
    return this.request<any>('/bids', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMyBids() {
    if (USE_MOCK) return [];
    return this.request<any>('/bids/my-bids');
  }

  // Orders
  async createOrder(data: { listing_id: string; shipping_address: any; idempotency_key: string; offer_id?: string; auction_id?: string }) {
    return this.request<any>('/orders', { method: 'POST', body: JSON.stringify(data) });
  }

  async getOrders() {
    return this.request<any>('/orders');
  }

  async getOrder(id: string) {
    return this.request<any>(`/orders/${id}`);
  }

  // Payouts
  async getPayouts() {
    return this.request<any>('/payouts');
  }

  // Notifications
  async getNotifications(page = 1) {
    return this.request<any>(`/notifications?page=${page}`);
  }

  async getUnreadCount() {
    return this.request<any>('/notifications/unread-count');
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'POST' });
  }

  // Admin
  async getAdminDashboard() {
    return this.request<any>('/admin/dashboard');
  }

  async getAdminSubmissions(stage?: string) {
    const query = stage ? `?stage=${stage}` : '';
    return this.request<any>(`/admin/submissions${query}`);
  }

  async getAdminSubmission(id: string) {
    return this.request<any>(`/admin/submissions/${id}`);
  }

  async reviewSubmission(id: string, data: { action: string; proposed_price?: number; rejection_reason?: string; admin_notes?: string }) {
    return this.request<any>(`/admin/submissions/${id}/review`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async respondToPickup(submissionId: string, data: {
    action: 'accept' | 'reject' | 'cancel';
    admin_suggested_date?: string;
    admin_suggested_time_from?: string;
    admin_suggested_time_to?: string;
    admin_pickup_notes?: string;
  }) {
    return this.request<any>(`/admin/pickups/${submissionId}/respond`, { method: 'POST', body: JSON.stringify(data) });
  }

  async dispatchDriver(submissionId: string) {
    return this.request<any>(`/admin/pickups/${submissionId}/dispatch`, { method: 'PATCH' });
  }

  async markArrived(submissionId: string) {
    return this.request<any>(`/admin/pickups/${submissionId}/arrived`, { method: 'PATCH' });
  }

  async submitQCReport(data: { submission_id: string; passed: boolean; notes?: string }) {
    return this.request<any>('/admin/qc-reports', { method: 'POST', body: JSON.stringify(data) });
  }

  async markPhotoshootDone(submissionId: string, data?: { pro_photos?: string[]; pro_description?: string }) {
    return this.request<any>(`/admin/submissions/${submissionId}/photoshoot`, { method: 'PATCH', body: JSON.stringify(data || {}) });
  }

  async createListing(data: { submission_id: string; photos: string[]; description?: string; price: number; original_price?: number | null; featured?: boolean }) {
    return this.request<any>('/admin/listings', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateListingStatus(id: string, status: string) {
    return this.request<any>(`/admin/listings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }

  async updateOrderStatus(id: string, data: { status: string; tracking_number?: string; reason?: string }) {
    return this.request<any>(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getAdminPayouts(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any>(`/admin/payouts${query}`);
  }

  async triggerPayout(orderId: string) {
    return this.request<any>(`/admin/payouts/${orderId}/trigger`, { method: 'POST' });
  }

  async updatePayoutStatus(id: string, status: string) {
    return this.request<any>(`/admin/payouts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }

  async getAdminSellers(page = 1) {
    return this.request<any>(`/admin/sellers?page=${page}`);
  }

  async getAdminCelebrities() {
    return this.request<any>('/admin/celebrities');
  }

  async createCelebrity(data: { name: string; bio: string; followers: string; avatar_url?: string }) {
    return this.request<any>('/admin/celebrities', { method: 'POST', body: JSON.stringify(data) });
  }

  async createAuction(data: { listing_id: string; starting_price: number; starts_at: string; ends_at: string; reserve_price?: number }) {
    return this.request<any>('/admin/auctions', { method: 'POST', body: JSON.stringify(data) });
  }

  async getAdminAuctions() {
    return this.request<any>('/admin/auctions');
  }

  async endAuction(auctionId: string) {
    return this.request<any>(`/admin/auctions/${auctionId}/end`, { method: 'POST' });
  }

  // Storage / Uploads
  async uploadSubmissionPhotos(submissionId: string, files: File[]) {
    if (USE_MOCK) {
      return { urls: files.map((f) => URL.createObjectURL(f)) };
    }
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    return this.request<{ urls: string[] }>(`/storage/submission-photos/${submissionId}`, {
      method: 'POST',
      body: formData,
    });
  }

  async uploadListingPhotos(submissionId: string, files: File[]) {
    if (USE_MOCK) {
      return { urls: files.map((f) => URL.createObjectURL(f)) };
    }
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    return this.request<{ urls: string[] }>(`/storage/listing-photos/${submissionId}`, {
      method: 'POST',
      body: formData,
    });
  }

  async uploadAvatar(file: File) {
    if (USE_MOCK) {
      return { url: URL.createObjectURL(file) };
    }
    const formData = new FormData();
    formData.append('avatar', file);
    return this.request<{ url: string }>('/storage/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadCelebrityAvatar(celebrityId: string, file: File) {
    if (USE_MOCK) {
      return { url: URL.createObjectURL(file) };
    }
    const formData = new FormData();
    formData.append('avatar', file);
    return this.request<{ url: string }>(`/storage/celebrity-avatar/${celebrityId}`, {
      method: 'POST',
      body: formData,
    });
  }

  // Developer
  async getDeveloperDashboard() {
    if (USE_MOCK) {
      return {
        total_users: Object.keys(MOCK_USERS).length,
        users_by_role: { customer: 5, celebrity: 1, admin: 1, developer: 1 },
        total_errors: 3,
        total_audit_entries: 12,
        uptime: 86400,
      };
    }
    return this.request<any>('/developer/dashboard');
  }

  async getDeveloperUsers(params: Record<string, string> = {}) {
    if (USE_MOCK) {
      const users = Object.values(MOCK_USERS).map(u => ({
        ...u.profile,
        created_at: '2025-01-15T10:00:00Z',
        disabled_at: null,
      }));
      return { users, total: users.length, page: 1, totalPages: 1 };
    }
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/developer/users${query ? `?${query}` : ''}`);
  }

  async changeUserRole(userId: string, role: string) {
    if (USE_MOCK) return { success: true, old_role: 'customer', new_role: role };
    return this.request<any>(`/developer/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
  }

  async toggleUserDisable(userId: string, disable: boolean) {
    if (USE_MOCK) return { success: true, disabled: disable };
    return this.request<any>(`/developer/users/${userId}/disable`, { method: 'PATCH', body: JSON.stringify({ disable }) });
  }

  async getAuditLogs(params: Record<string, string> = {}) {
    if (USE_MOCK) {
      return {
        logs: [
          { id: '1', entity_type: 'submission', action: 'admin_review', actor_id: 'mock-user-admin', actor_name: 'WIMC Admin', entity_id: 'sub-1', old_values: null, new_values: { action: 'approve' }, created_at: '2025-03-10T14:00:00Z', metadata: {} },
          { id: '2', entity_type: 'user', action: 'role_change', actor_id: 'mock-user-dev', actor_name: 'WIMC Developer', entity_id: 'mock-user-reem', old_values: { role: 'customer' }, new_values: { role: 'celebrity' }, created_at: '2025-03-09T10:30:00Z', metadata: {} },
        ],
        total: 2, page: 1, totalPages: 1,
      };
    }
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/developer/audit-logs${query ? `?${query}` : ''}`);
  }

  async getErrorLogs(params: Record<string, string> = {}) {
    if (USE_MOCK) {
      return {
        errors: [
          { id: 'err-1', error_type: 'InternalServerErrorException', message: 'Database connection timeout', endpoint: 'GET /api/listings', http_status: 500, created_at: '2025-03-10T16:00:00Z' },
          { id: 'err-2', error_type: 'TypeError', message: 'Cannot read properties of null', endpoint: 'POST /api/orders', http_status: 500, created_at: '2025-03-09T12:00:00Z' },
        ],
        total: 2, page: 1, totalPages: 1,
      };
    }
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/developer/error-logs${query ? `?${query}` : ''}`);
  }

  async getErrorLog(id: string) {
    if (USE_MOCK) {
      return {
        id, error_type: 'InternalServerErrorException', message: 'Database connection timeout',
        stack_trace: 'Error: Database connection timeout\n    at SupabaseService.query (/app/src/supabase/supabase.service.ts:45:11)\n    at ListingsService.getAll (/app/src/listings/listings.service.ts:23:20)\n    at ListingsController.browse (/app/src/listings/listings.controller.ts:15:24)',
        endpoint: 'GET /api/listings', http_status: 500, user_id: null,
        request_body: null, metadata: { ip: '127.0.0.1', user_agent: 'Mozilla/5.0' }, created_at: '2025-03-10T16:00:00Z',
      };
    }
    return this.request<any>(`/developer/error-logs/${id}`);
  }

  async getActiveSessions() {
    if (USE_MOCK) {
      return Object.values(MOCK_USERS).map(u => ({
        id: u.profile.id,
        email: u.profile.email,
        display_name: u.profile.display_name,
        role: u.profile.role,
        last_sign_in_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        created_at: '2025-01-15T10:00:00Z',
      }));
    }
    return this.request<any>('/developer/sessions');
  }

  async forceLogoutUser(userId: string) {
    if (USE_MOCK) return { success: true };
    return this.request<any>(`/developer/sessions/${userId}/force-logout`, { method: 'POST' });
  }

  async getApiOverview() {
    if (USE_MOCK) {
      return {
        cors_origins: ['http://localhost:3000'],
        rate_limit: { ttl_ms: 60000, limit: 60 },
        supabase: { url_configured: true, anon_key_configured: true, service_key_configured: true },
        commission_rates: { bronze: 20, silver: 18, gold: 15, platinum: 12 },
        uptime_seconds: 86400,
        node_version: 'v20.11.0',
        environment: 'development',
      };
    }
    return this.request<any>('/developer/api-overview');
  }
}

export const api = new ApiClient(API_URL);
