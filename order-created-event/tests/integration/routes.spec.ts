import { expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';

jest.mock('../../src/utils/config.utils');
jest.mock('../../src/client/create.client');

const envelope = (message: unknown) => ({
  message: {
    data: Buffer.from(JSON.stringify(message)).toString('base64'),
  },
});

describe('the order-created event application', () => {
  // The route has to be mounted where Connect delivers — {url}/{endpoint},
  // with `endpoint` taken from connect.yaml. Mounted anywhere else, every
  // message from the Subscription gets a 404 and is retried for a week.
  test('answers on the path connect.yaml declares', async () => {
    const response = await request(app)
      .post('/order-created-event')
      .send(envelope({ type: 'OrderCreated' }));
    expect(response.status).toBe(204);
  });

  test('404s on anything else', async () => {
    const response = await request(app).post('/event');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Path not found.' });
  });

  // Everything acknowledges. The queue retries any non-2xx for seven days,
  // and none of these will ever succeed on a retry.
  test('acknowledges an envelope with no data', async () => {
    const response = await request(app).post('/order-created-event').send({ message: {} });
    expect(response.status).toBe(204);
  });

  test('acknowledges unparseable data', async () => {
    const response = await request(app)
      .post('/order-created-event')
      .send({ message: { data: 'bm90IGpzb24=' } });
    expect(response.status).toBe(204);
  });

  test('acknowledges a message of another type', async () => {
    const response = await request(app)
      .post('/order-created-event')
      .send(envelope({ type: 'CustomerCreated', customer: { id: 'c-1' } }));
    expect(response.status).toBe(204);
  });

  test('acknowledges an order with no cart behind it', async () => {
    const response = await request(app)
      .post('/order-created-event')
      .send(envelope({ type: 'OrderCreated', order: { id: 'o-1' } }));
    expect(response.status).toBe(204);
  });
});
