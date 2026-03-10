/**
 * WIMC Email HTML Templates
 * Dark theme matching the app: #0A0A0A bg, #FF4444 accent
 */

export function wrapInTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 30px 0;text-align:center;">
              <h1 style="font-size:28px;font-weight:bold;letter-spacing:2px;margin:0;color:#ffffff;">WIMC</h1>
              <p style="font-size:12px;color:#666;margin:4px 0 0 0;font-style:italic;">by Dina Bahgat</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#141414;border:1px solid #222;border-radius:12px;padding:32px;">
              <h2 style="font-size:20px;font-weight:600;margin:0 0 16px 0;color:#ffffff;">${title}</h2>
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="font-size:11px;color:#555;margin:0;">
                &copy; ${new Date().getFullYear()} WHATINMYCLOSET. All rights reserved.
              </p>
              <p style="font-size:11px;color:#444;margin:8px 0 0 0;">
                Luxury Pre-Loved Marketplace &middot; Cairo, Egypt
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function paragraph(text: string): string {
  return `<p style="font-size:14px;line-height:1.6;color:#ccc;margin:0 0 12px 0;">${text}</p>`;
}

function highlight(text: string): string {
  return `<span style="color:#FF4444;font-weight:bold;">${text}</span>`;
}

function button(text: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:#FF4444;border-radius:8px;padding:12px 28px;">
          <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${text}</a>
        </td>
      </tr>
    </table>`;
}

const SITE_URL = process.env.CORS_ORIGIN?.split(',')[0] || 'https://whatinmycloset.com';

// ── Submission Templates ────────────────────────

export function submissionReceivedHtml(itemName: string): string {
  return wrapInTemplate('Submission Received', `
    ${paragraph(`Your item ${highlight(itemName)} has been submitted for review.`)}
    ${paragraph('Our team will review it within 24 hours and suggest a listing price.')}
    ${button('View Submissions', `${SITE_URL}/seller/submissions`)}
  `);
}

export function priceSuggestedHtml(itemName: string, price: number): string {
  return wrapInTemplate('Price Suggested', `
    ${paragraph(`We've reviewed your ${highlight(itemName)} and suggest a listing price of:`)}
    <p style="font-size:32px;font-weight:bold;color:#ffffff;text-align:center;margin:20px 0;">$${price.toLocaleString()}</p>
    ${paragraph('Please log in to accept or reject this price.')}
    ${button('Review Price', `${SITE_URL}/seller/submissions`)}
  `);
}

export function priceResponseHtml(itemName: string, accepted: boolean): string {
  const status = accepted ? 'accepted' : 'rejected';
  return wrapInTemplate(`Price ${accepted ? 'Accepted' : 'Rejected'}`, `
    ${paragraph(`The seller has ${highlight(status)} the proposed price for ${highlight(itemName)}.`)}
    ${accepted ? paragraph('You can now schedule a pickup.') : paragraph('The submission has been closed.')}
    ${button('View in Admin', `${SITE_URL}/admin`)}
  `);
}

export function authFailedHtml(itemName: string, reason?: string): string {
  return wrapInTemplate('Authentication Failed', `
    ${paragraph(`Unfortunately, your item ${highlight(itemName)} did not pass our authentication check.`)}
    ${reason ? paragraph(`Reason: ${reason}`) : ''}
    ${paragraph('We will arrange a return of your item. If you have questions, please contact our support team.')}
  `);
}

// ── Offer Templates ─────────────────────────────

export function newOfferHtml(itemName: string, amount: number, buyerName: string): string {
  return wrapInTemplate('New Offer Received', `
    ${paragraph(`${highlight(buyerName)} has made an offer on your ${highlight(itemName)}:`)}
    <p style="font-size:28px;font-weight:bold;color:#ffffff;text-align:center;margin:20px 0;">$${amount.toLocaleString()}</p>
    ${paragraph('Log in to accept or decline this offer.')}
    ${button('View Offers', `${SITE_URL}/seller/dashboard`)}
  `);
}

export function offerResponseHtml(itemName: string, accepted: boolean, amount: number): string {
  return wrapInTemplate(`Offer ${accepted ? 'Accepted' : 'Declined'}`, `
    ${paragraph(`Your offer of ${highlight('$' + amount.toLocaleString())} on ${highlight(itemName)} has been ${accepted ? 'accepted' : 'declined'}.`)}
    ${accepted
      ? paragraph('You can now proceed to checkout to complete your purchase.')
      : paragraph('The item is still available — you can make a new offer or browse other items.')}
    ${accepted ? button('Complete Purchase', `${SITE_URL}/browse`) : button('Browse Items', `${SITE_URL}/browse`)}
  `);
}

// ── Order Templates ─────────────────────────────

export function orderConfirmationBuyerHtml(itemName: string, total: number, orderId: string): string {
  return wrapInTemplate('Order Confirmed', `
    ${paragraph('Thank you for your purchase!')}
    ${paragraph(`Your order for ${highlight(itemName)} has been confirmed.`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#888;font-size:13px;">Order Total</td><td style="padding:8px 0;text-align:right;color:#fff;font-weight:bold;font-size:16px;">$${total.toLocaleString()}</td></tr>
    </table>
    ${paragraph('We\'ll notify you when your order ships.')}
    ${button('Track Order', `${SITE_URL}/orders/${orderId}`)}
  `);
}

export function orderConfirmationSellerHtml(itemName: string, itemPrice: number): string {
  return wrapInTemplate('Item Sold!', `
    ${paragraph(`Great news! Your ${highlight(itemName)} has been purchased.`)}
    <p style="font-size:28px;font-weight:bold;color:#ffffff;text-align:center;margin:20px 0;">$${itemPrice.toLocaleString()}</p>
    ${paragraph('We\'ll process the shipment and your payout will be scheduled after the buyer\'s inspection window.')}
    ${button('View Sales', `${SITE_URL}/seller/dashboard`)}
  `);
}

export function shippingUpdateHtml(itemName: string, status: string, trackingNumber?: string): string {
  const statusText = status === 'shipped' ? 'has been shipped' : 'has been delivered';
  return wrapInTemplate(`Order ${status === 'shipped' ? 'Shipped' : 'Delivered'}`, `
    ${paragraph(`Your ${highlight(itemName)} ${statusText}!`)}
    ${trackingNumber ? paragraph(`Tracking number: ${highlight(trackingNumber)}`) : ''}
    ${status === 'delivered' ? paragraph('You have 3 days to inspect the item. If everything looks good, the order will be completed automatically.') : ''}
    ${button('View Order', `${SITE_URL}/orders`)}
  `);
}
