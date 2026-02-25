import { MOCK_LISTINGS, MOCK_CELEBRITIES } from './mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Mock users for local testing (USE_MOCK=true only)
const MOCK_USERS: Record<string, { password: string; profile: any }> = {
  'seller@test.wimc.com': {
    password: 'Seller123!',
    profile: { id: 'mock-user-seller', email: 'seller@test.wimc.com', display_name: 'Sara Seller', role: 'seller', avatar_url: null, points: 1200, tier: 'Silver' },
  },
  'buyer@test.wimc.com': {
    password: 'Buyer123!',
    profile: { id: 'mock-user-buyer', email: 'buyer@test.wimc.com', display_name: 'Bea Buyer', role: 'buyer', avatar_url: null, points: 300, tier: 'Bronze' },
  },
  'celeb@test.wimc.com': {
    password: 'Celeb123!',
    profile: { id: 'mock-user-celeb', email: 'celeb@test.wimc.com', display_name: 'Yasmine Sabri', role: 'vip_seller', avatar_url: null, points: 5000, tier: 'Gold' },
  },
  'admin@test.wimc.com': {
    password: 'Admin123!',
    profile: { id: 'mock-user-admin', email: 'admin@test.wimc.com', display_name: 'WIMC Admin', role: 'admin', avatar_url: null, points: 0, tier: 'Gold' },
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
    document.cookie = `wimc_token=${token}; path=/; SameSite=Lax; max-age=86400`;
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
    }
    return this.request<any>(`/listings/${id}`);
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

  // Orders
  async createOrder(data: { listing_id: string; shipping_address: any; idempotency_key: string; offer_id?: string }) {
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

  async schedulePickup(data: any) {
    return this.request<any>('/admin/pickups', { method: 'POST', body: JSON.stringify(data) });
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

  async createListing(data: { submission_id: string; photos: string[]; description?: string; price: number; featured?: boolean }) {
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
}

export const api = new ApiClient(API_URL);
