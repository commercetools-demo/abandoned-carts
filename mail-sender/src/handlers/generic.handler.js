import CustomError from '../errors/custom.error.js';
import { HTTP_STATUS_SERVER_ERROR } from '../constants/http-status.constants.js';
import { logger } from '../utils/logger.utils.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Abandoned Carts <onboarding@resend.dev>';

/**
 * Demo mode: send everything to one inbox.
 *
 * A demo Project's carts carry whatever addresses people typed into the
 * storefront, and a run would mail all of them for real. Setting
 * ABANDONED_CART_DEMO_RECIPIENT keeps delivery working end to end — a real
 * send, through Resend, that someone can open — while making it impossible
 * to reach anyone who did not ask.
 *
 * The redirect is visible rather than silent: the recipient is told who the
 * message was addressed to.
 */
function demoRecipient() {
  const value = process.env.ABANDONED_CART_DEMO_RECIPIENT?.trim();
  return value ? value : null;
}

function fromAddress() {
  return process.env.ABANDONED_CART_FROM?.trim() || DEFAULT_FROM;
}

class GenericHandler {
  /**
   * Render one message and hand it to Resend.
   *
   * Returns a result rather than throwing on a delivery failure. The Custom
   * Object records what was rendered and whether it left, because a send
   * that vanishes — an expired key, an unverified sending domain — is the
   * failure that is hardest to notice from the outside: the cart would sit
   * in the Merchant Center marked "Not sent" with nothing saying why.
   */
  async sendMail(recipientEmailAddress, subject, templateData) {
    const redirect = demoRecipient();
    const to = redirect ?? recipientEmailAddress;
    const from = fromAddress();

    const { html, text } = this.renderBody(templateData, recipientEmailAddress, redirect);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.info(
        `RESEND_API_KEY is not set — rendered the message for ${recipientEmailAddress} and sent nothing.`
      );
      return {
        delivered: false,
        deliveredTo: null,
        detail: 'RESEND_API_KEY is not set — rendered but not sent.',
        subject,
        html,
      };
    }

    try {
      // An event application must acknowledge within 10 seconds, so a slow
      // mail API has to lose rather than take the whole delivery down.
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        logger.error(`Resend answered HTTP ${response.status}: ${detail}`);
        return {
          delivered: false,
          deliveredTo: null,
          detail: `Resend answered HTTP ${response.status}: ${detail}`,
          subject,
          html,
        };
      }

      const body = await response.json();
      const detail = redirect
        ? `Demo mode: redirected to ${redirect}, accepted as ${body.id ?? 'an unnamed message'}`
        : `Resend accepted it as ${body.id ?? 'an unnamed message'}`;
      logger.info(detail);

      return { delivered: true, deliveredTo: to, detail, subject, html };
    } catch (error) {
      logger.error(`Resend call failed: ${error.message}`);
      return {
        delivered: false,
        deliveredTo: null,
        detail: `Resend call failed: ${error.message}`,
        subject,
        html,
      };
    }
  }

  /**
   * The body as it is actually sent.
   *
   * One function for both the HTML and its plain-text twin, and the demo
   * footer is appended here rather than at the call site, so what the
   * Custom Object records is what went out.
   */
  renderBody(templateData, addressedTo, redirect) {
    let html = templateData.emailTemplate
      ? templateData.emailTemplate
      : this.generateHtmlFromTemplateData(templateData);

    if (redirect) {
      html += `<hr /><p style="color:#666;font-size:12px">[Demo mode] Addressed to ${addressedTo}; delivered here instead.</p>`;
    }

    const text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim();

    return { html, text };
  }

  generateHtmlFromTemplateData(templateData) {
    const rows = [];

    if (templateData.cartTotal) {
      rows.push(
        `<p><strong>Cart total:</strong> ${templateData.cartTotal} ${
          templateData.currencyCode || 'USD'
        }</p>`
      );
    }
    if (templateData.cartLineItems) {
      rows.push(`<p><strong>Items in cart:</strong> ${templateData.cartLineItems}</p>`);
    }
    if (templateData.abandonmentDate) {
      const date = new Date(templateData.abandonmentDate).toLocaleDateString();
      rows.push(`<p><strong>Last updated:</strong> ${date}</p>`);
    }

    const greeting = templateData.customerFirstName
      ? `<h2>Hello ${templateData.customerFirstName},</h2>`
      : '<h2>Hello,</h2>';

    return `<html><body>${greeting}<p>You left something in your cart.</p>${rows.join(
      ''
    )}</body></html>`;
  }

  process() {
    // Write the actual implementation in inherited handlers
    throw new CustomError(
      HTTP_STATUS_SERVER_ERROR,
      `Missing actual implementation in message handler`
    );
  }
}

export default GenericHandler;
