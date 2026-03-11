jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email-1' }),
    },
  })),
}));

import { EmailService } from './email.service';
import { Resend } from 'resend';

describe('EmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('without API key', () => {
    it('should log email instead of sending when RESEND_API_KEY is not set', async () => {
      delete process.env.RESEND_API_KEY;
      const service = new EmailService();

      const loggerSpy = jest.spyOn(service['logger'] || console, 'log').mockImplementation();

      await service.sendSubmissionReceived('seller@wimc.com', 'Gucci Bag');

      expect(loggerSpy).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });
  });

  describe('with API key present', () => {
    let service: EmailService;
    let mockResendInstance: { emails: { send: jest.Mock } };

    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_123456789';
      mockResendInstance = {
        emails: {
          send: jest.fn().mockResolvedValue({ id: 'email-1' }),
        },
      };
      (Resend as jest.MockedClass<typeof Resend>).mockImplementation(
        () => mockResendInstance as any,
      );
      service = new EmailService();
    });

    it('should call resend.emails.send when API key is present', async () => {
      await service.sendSubmissionReceived('seller@wimc.com', 'Gucci Bag');

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'seller@wimc.com',
        }),
      );
    });

    it('should send submission received with correct subject', async () => {
      await service.sendSubmissionReceived('seller@wimc.com', 'Gucci Bag');

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Submission'),
        }),
      );
    });

    it('should send order confirmation to both buyer and seller', async () => {
      await service.sendOrderConfirmation(
        'buyer@example.com',
        'seller@wimc.com',
        'Chanel Classic Flap',
        15000,
        12000,
        'order-123',
      );

      const sendCalls = mockResendInstance.emails.send.mock.calls;

      // Should be called at least twice (once for buyer, once for seller)
      // or once with both recipients
      const allRecipients = sendCalls.flatMap(
        (call: any[]) => call[0]?.to || [],
      );
      expect(allRecipients).toEqual(
        expect.arrayContaining(['buyer@example.com', 'seller@wimc.com']),
      );
    });
  });
});
