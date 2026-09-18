import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';

import GenericHandler from '../../src/handlers/generic.handler.js';

const TEMPLATE = { emailTemplate: '<p>Come back, Jen.</p>' };

describe('generic.handler', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.ABANDONED_CART_DEMO_RECIPIENT;
    delete process.env.ABANDONED_CART_FROM;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const captureSend = (response) => {
    const calls = [];
    global.fetch = (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return Promise.resolve(
        response ?? {
          ok: true,
          json: () => Promise.resolve({ id: 'msg-1' }),
        }
      );
    };
    return calls;
  };

  // The honest default for a demo: everything runs, nothing is mailed.
  it('renders but does not send when no API key is configured', async () => {
    const calls = captureSend();

    const result = await new GenericHandler().sendMail(
      'jen@example.com',
      'Your cart',
      TEMPLATE
    );

    expect(calls).toHaveLength(0);
    expect(result.delivered).toBe(false);
    expect(result.detail).toContain('RESEND_API_KEY is not set');
    expect(result.html).toContain('Come back, Jen.');
  });

  it('sends through Resend when a key is configured', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const calls = captureSend();

    const result = await new GenericHandler().sendMail(
      'jen@example.com',
      'Your cart',
      TEMPLATE
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].body.to).toEqual(['jen@example.com']);
    expect(calls[0].body.subject).toBe('Your cart');
    expect(result.delivered).toBe(true);
    expect(result.deliveredTo).toBe('jen@example.com');
  });

  // Demo mode must reach the demo inbox and nobody else's, and the
  // redirect has to be visible in the message rather than silent.
  it('redirects every message to the demo recipient and says so', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.ABANDONED_CART_DEMO_RECIPIENT = 'demo@example.com';
    const calls = captureSend();

    const result = await new GenericHandler().sendMail(
      'shopper@example.com',
      'Your cart',
      TEMPLATE
    );

    expect(calls[0].body.to).toEqual(['demo@example.com']);
    expect(calls[0].body.html).toContain('Addressed to shopper@example.com');
    expect(result.deliveredTo).toBe('demo@example.com');
  });

  it('uses the configured from address', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.ABANDONED_CART_FROM = 'Acme <carts@acme.test>';
    const calls = captureSend();

    await new GenericHandler().sendMail('jen@example.com', 'Your cart', TEMPLATE);

    expect(calls[0].body.from).toBe('Acme <carts@acme.test>');
  });

  // A send that vanishes is the failure hardest to notice from outside, so
  // it is reported rather than thrown — the record is what makes it visible.
  it('reports a rejected send instead of throwing', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    captureSend({
      ok: false,
      status: 403,
      text: () => Promise.resolve('domain is not verified'),
    });

    const result = await new GenericHandler().sendMail(
      'jen@example.com',
      'Your cart',
      TEMPLATE
    );

    expect(result.delivered).toBe(false);
    expect(result.detail).toContain('403');
    expect(result.detail).toContain('domain is not verified');
  });

  it('falls back to a generated body when no template is stored', async () => {
    const result = await new GenericHandler().sendMail('jen@example.com', 'Your cart', {
      customerFirstName: 'Jen',
      cartTotal: '100.00',
      currencyCode: 'USD',
      cartLineItems: 2,
    });

    expect(result.html).toContain('Hello Jen,');
    expect(result.html).toContain('100.00 USD');
    expect(result.html).toContain('Items in cart:</strong> 2');
  });
});
