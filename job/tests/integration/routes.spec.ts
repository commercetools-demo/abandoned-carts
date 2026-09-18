import { expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';

const originalFetch = global.fetch;
const originalUrl = process.env.ABANDONED_CART_SERVICE_URL;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.ABANDONED_CART_SERVICE_URL;
  else process.env.ABANDONED_CART_SERVICE_URL = originalUrl;
});

const captureCall = () => {
  const calls: string[] = [];
  global.fetch = ((url: string) => {
    calls.push(String(url));
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, totalCreated: 0 }),
    });
  }) as unknown as typeof fetch;
  return calls;
};

describe('the scheduled job', () => {
  // Connect assigns the service its URL at deployment, and whoever fills
  // this in may paste either the origin or the full endpoint URL Connect
  // reported. Both have to reach the same place, or the schedule 404s every
  // five minutes and nothing says why.
  test('reaches the service when given its origin', async () => {
    process.env.ABANDONED_CART_SERVICE_URL = 'https://service-abc.commercetools.app';
    const calls = captureCall();

    const response = await request(app).post('/job');

    expect(response.status).toBe(200);
    expect(calls).toEqual([
      'https://service-abc.commercetools.app/abandoned-cart/process',
    ]);
  });

  test('reaches the service when given the endpoint URL Connect reports', async () => {
    process.env.ABANDONED_CART_SERVICE_URL =
      'https://service-abc.commercetools.app/abandoned-cart';
    const calls = captureCall();

    await request(app).post('/job');

    expect(calls).toEqual([
      'https://service-abc.commercetools.app/abandoned-cart/process',
    ]);
  });

  // Left at its placeholder, the job would quietly hit localhost forever.
  test('fails loudly when the service URL was never configured', async () => {
    delete process.env.ABANDONED_CART_SERVICE_URL;

    const response = await request(app).post('/job');

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('ABANDONED_CART_SERVICE_URL is not set');
  });

  test('fails when the service answers an error', async () => {
    process.env.ABANDONED_CART_SERVICE_URL = 'https://service-abc.commercetools.app';
    global.fetch = (() =>
      Promise.resolve({
        ok: false,
        status: 503,
        text: () => Promise.resolve('service unavailable'),
      })) as unknown as typeof fetch;

    const response = await request(app).post('/job');

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('503');
  });

  test('404s on anything but the job path', async () => {
    const response = await request(app).post('/nope');
    expect(response.status).toBe(404);
  });
});
