import { Request, Response } from 'express';
import { createApiRoot } from '../client/create.client';
import { logger } from '../utils/logger.utils';

const ABANDONED_CARTS_CONTAINER = 'abandoned-carts';

/**
 * Marks a recorded abandoned cart as converted when its order is placed.
 *
 * Every path acknowledges. The message queue retries anything that is not a
 * 2xx, so answering an error to a message this application simply has no use
 * for — a different message type, an order with no cart, a cart nobody
 * recorded — would put that message into a redelivery loop that lasts a week
 * and never succeeds. Nothing here is worth a retry: the order exists either
 * way, and the conversion timestamp is a record, not a transaction.
 */
export const post = async (request: Request, response: Response) => {
  const ack = () => response.status(204).send();

  const data = request.body?.message?.data;
  if (!data) {
    logger.warn('No Pub/Sub message data on the request, acknowledging.');
    return ack();
  }

  let message: Record<string, unknown>;
  try {
    message = JSON.parse(Buffer.from(data, 'base64').toString().trim());
  } catch (error) {
    logger.error(
      `Could not parse the Pub/Sub message, acknowledging: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    return ack();
  }

  const order = message.order as { id?: string; cart?: { id?: string }; createdAt?: string } | undefined;
  if (message.type !== 'OrderCreated' || !order) {
    logger.info(`Ignoring a ${String(message.type)} message.`);
    return ack();
  }

  const cartId = order.cart?.id;
  if (!cartId) {
    logger.info(`Order ${order.id} has no cart reference, nothing to mark.`);
    return ack();
  }

  try {
    const { body: customObject } = await createApiRoot()
      .customObjects()
      .withContainerAndKey({ container: ABANDONED_CARTS_CONTAINER, key: cartId })
      .get()
      .execute();

    await createApiRoot()
      .customObjects()
      .post({
        body: {
          container: ABANDONED_CARTS_CONTAINER,
          key: cartId,
          version: customObject.version,
          value: {
            ...(customObject.value as Record<string, unknown>),
            cartConvertedDate: order.createdAt ?? new Date().toISOString(),
          },
        },
      })
      .execute();

    logger.info(`Cart ${cartId} converted into order ${order.id}.`);
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) {
      logger.info(`Cart ${cartId} was never recorded as abandoned, nothing to mark.`);
    } else {
      logger.error(
        `Could not mark cart ${cartId} as converted: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  return ack();
};
