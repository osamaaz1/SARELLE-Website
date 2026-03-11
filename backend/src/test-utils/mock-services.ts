/**
 * Mock factories for commonly injected services.
 */

export function createMockEmailService() {
  return {
    sendSubmissionReceived: jest.fn().mockResolvedValue(undefined),
    sendPriceSuggested: jest.fn().mockResolvedValue(undefined),
    sendPriceResponse: jest.fn().mockResolvedValue(undefined),
    sendAuthFailed: jest.fn().mockResolvedValue(undefined),
    sendNewOffer: jest.fn().mockResolvedValue(undefined),
    sendOfferResponse: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    sendShippingUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

export function createMockGateway() {
  return {
    emitToUser: jest.fn(),
    emitToAdmin: jest.fn(),
    emitToSellers: jest.fn(),
    emitToAuction: jest.fn(),
    server: {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    },
  };
}

export function createMockNotificationsService() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    listByUser: jest.fn().mockResolvedValue({ notifications: [], total: 0, page: 1, totalPages: 0 }),
    markRead: jest.fn().mockResolvedValue(undefined),
    markAllRead: jest.fn().mockResolvedValue(undefined),
    getUnreadCount: jest.fn().mockResolvedValue({ count: 0 }),
  };
}

export function createMockAuthService() {
  return {
    validateToken: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@test.com' }),
    getProfile: jest.fn().mockResolvedValue({ id: 'user-1', role: 'customer', display_name: 'Test User' }),
    register: jest.fn(),
    login: jest.fn(),
  };
}
