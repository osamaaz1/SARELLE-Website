import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import * as templates from './templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = process.env.EMAIL_FROM || 'WIMC <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
    }
  }

  // ── Submission Events ────────────────────────

  async sendSubmissionReceived(sellerEmail: string, itemName: string) {
    await this.send(
      sellerEmail,
      'Submission Received — WIMC',
      templates.submissionReceivedHtml(itemName),
    );
  }

  async sendPriceSuggested(sellerEmail: string, itemName: string, price: number) {
    await this.send(
      sellerEmail,
      `Price Suggested: $${price.toLocaleString()} — WIMC`,
      templates.priceSuggestedHtml(itemName, price),
    );
  }

  async sendPriceResponse(adminEmail: string, itemName: string, accepted: boolean) {
    await this.send(
      adminEmail,
      `Price ${accepted ? 'Accepted' : 'Rejected'}: ${itemName} — WIMC`,
      templates.priceResponseHtml(itemName, accepted),
    );
  }

  async sendAuthFailed(sellerEmail: string, itemName: string, reason?: string) {
    await this.send(
      sellerEmail,
      `Authentication Failed: ${itemName} — WIMC`,
      templates.authFailedHtml(itemName, reason),
    );
  }

  // ── Offer Events ─────────────────────────────

  async sendNewOffer(sellerEmail: string, itemName: string, amount: number, buyerName: string) {
    await this.send(
      sellerEmail,
      `New Offer: $${amount.toLocaleString()} on ${itemName} — WIMC`,
      templates.newOfferHtml(itemName, amount, buyerName),
    );
  }

  async sendOfferResponse(buyerEmail: string, itemName: string, accepted: boolean, amount: number) {
    await this.send(
      buyerEmail,
      `Offer ${accepted ? 'Accepted' : 'Declined'}: ${itemName} — WIMC`,
      templates.offerResponseHtml(itemName, accepted, amount),
    );
  }

  // ── Order Events ─────────────────────────────

  async sendOrderConfirmation(buyerEmail: string, sellerEmail: string, itemName: string, total: number, itemPrice: number, orderId: string) {
    await Promise.all([
      this.send(
        buyerEmail,
        `Order Confirmed: ${itemName} — WIMC`,
        templates.orderConfirmationBuyerHtml(itemName, total, orderId),
      ),
      this.send(
        sellerEmail,
        `Item Sold: ${itemName} — WIMC`,
        templates.orderConfirmationSellerHtml(itemName, itemPrice),
      ),
    ]);
  }

  async sendShippingUpdate(buyerEmail: string, itemName: string, status: string, trackingNumber?: string) {
    await this.send(
      buyerEmail,
      `Order ${status === 'shipped' ? 'Shipped' : 'Delivered'}: ${itemName} — WIMC`,
      templates.shippingUpdateHtml(itemName, status, trackingNumber),
    );
  }
}
