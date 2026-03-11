const mockFetch = jest.fn();
global.fetch = mockFetch;

// Must import after setting up fetch mock
import { api } from '@/lib/api';

describe('ApiClient (real mode)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    api.clearToken();
  });

  // --- Token management ---

  test('setToken stores token in localStorage', () => {
    api.setToken('test-token-123');
    expect(localStorage.getItem('wimc_token')).toBe('test-token-123');
  });

  test('clearToken removes token from localStorage', () => {
    api.setToken('test-token-123');
    api.clearToken();
    expect(localStorage.getItem('wimc_token')).toBeNull();
  });

  // --- login ---

  test('login calls fetch with POST /api/auth/login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ session: { access_token: 'tok' }, user: { id: '1' } }),
    });

    await api.login({ email: 'test@example.com', password: 'password123' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/auth/login');
    expect(options.method).toBe('POST');
  });

  test('login passes credentials in request body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ session: { access_token: 'tok' }, user: { id: '1' } }),
    });

    await api.login({ email: 'user@test.com', password: 'secret' });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.email).toBe('user@test.com');
    expect(body.password).toBe('secret');
  });

  // --- register ---

  test('register calls fetch with POST /api/auth/register', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ session: { access_token: 'tok' }, user: { id: '1' } }),
    });

    await api.register({ email: 'new@test.com', password: 'pass', role: 'buyer', displayName: 'New User' });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/auth/register');
    expect(options.method).toBe('POST');
  });

  // --- browseListings ---

  test('browseListings calls fetch with GET /api/listings', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([]),
    });

    await api.browseListings();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/listings');
  });

  test('browseListings adds query params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([]),
    });

    await api.browseListings({ category: 'Bags', sort: 'price_asc' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('category=Bags');
    expect(url).toContain('sort=price_asc');
  });

  // --- request behavior ---

  test('request includes Authorization header when token is set', async () => {
    api.setToken('my-jwt-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([]),
    });

    await api.browseListings();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer my-jwt-token');
  });

  test('request sets Content-Type to application/json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ session: { access_token: 'tok' }, user: {} }),
    });

    await api.login({ email: 'a@b.com', password: 'pass' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('request throws Error with message from non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Invalid credentials' }),
    });

    await expect(api.login({ email: 'bad@test.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
  });

  test('request handles 204 No Content', async () => {
    api.setToken('tok');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => '',
    });

    // 204 should not throw - use any endpoint that issues a DELETE or returns 204
    // We'll call a generic method; browseListings should still work if server returns 204
    const result = await api.browseListings();
    // Result may be empty/null/undefined depending on implementation
    expect(mockFetch).toHaveBeenCalled();
  });

  test('getFeaturedListings calls GET /api/listings/featured', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([]),
    });

    await api.getFeaturedListings();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/listings/featured');
  });
});
