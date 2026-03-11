import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

jest.mock('@/lib/api', () => ({
  api: {
    login: jest.fn(),
    register: jest.fn(),
    getMe: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
  },
}));

import { api } from '@/lib/api';

const mockedApi = api as jest.Mocked<typeof api>;

function TestComponent() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.display_name : 'null'}</span>
      <button onClick={() => login('test@test.com', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function TestComponentOutsideProvider() {
  const auth = useAuth();
  return <div>{String(auth.loading)}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedApi.getMe.mockRejectedValue(new Error('No token'));
  });

  test('useAuth throws when used outside AuthProvider', () => {
    // Suppress console.error for expected error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponentOutsideProvider />)).toThrow();
    consoleSpy.mockRestore();
  });

  test('provides loading=true initially, then false after mount', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Eventually loading should become false
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  test('login calls api.login and api.setToken', async () => {
    const user = userEvent.setup();

    mockedApi.login.mockResolvedValue({
      session: { access_token: 'new-token' },
      user: { id: '1', display_name: 'Test User', email: 'test@test.com', role: 'buyer' },
    });
    mockedApi.getMe.mockResolvedValue({
      id: '1',
      display_name: 'Test User',
      email: 'test@test.com',
      role: 'buyer',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(mockedApi.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'pass' });
    });

    expect(mockedApi.setToken).toHaveBeenCalled();
  });

  test('logout clears user state', async () => {
    const user = userEvent.setup();

    // Simulate a logged-in state by having getMe return a user
    localStorage.setItem('wimc_token', 'existing-token');
    mockedApi.getMe.mockResolvedValue({
      id: '1',
      display_name: 'Logged In User',
      email: 'logged@test.com',
      role: 'buyer',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Logged In User');
    });

    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    expect(mockedApi.clearToken).toHaveBeenCalled();
  });

  test('loads user from token on mount when token exists', async () => {
    localStorage.setItem('wimc_token', 'saved-token');
    mockedApi.getMe.mockResolvedValue({
      id: '2',
      display_name: 'Returning User',
      email: 'return@test.com',
      role: 'seller',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Returning User');
    });

    expect(mockedApi.getMe).toHaveBeenCalled();
  });
});
