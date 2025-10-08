import { Request, Response } from 'express';
import { createApiRoot } from '../client/create.client';
import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';

/**
 * Exposed event POST endpoint.
 * Receives the Pub/Sub message and updates abandoned cart custom object
 *
 * @param {Request} request The express request
 * @param {Response} response The express response
 * @returns
 */
export const post = async (request: Request, response: Response) => {
  // Check request body
  if (!request.body) {
    logger.error('Missing request body.');
    throw new CustomError(400, 'Bad request: No Pub/Sub message was received');
  }

  // Check if the body comes in a message
  if (!request.body.message) {
    logger.error('Missing body message');
    throw new CustomError(400, 'Bad request: Wrong Pub/Sub message format');
  }

  // Receive the Pub/Sub message
  const pubSubMessage = request.body.message;

  // Decode the message data
  const decodedData = pubSubMessage.data
    ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
    : undefined;

  if (!decodedData) {
    throw new CustomError(400, 'Bad request: No data in Pub/Sub message');
  }

  let orderCreatedMessage;
  try {
    orderCreatedMessage = JSON.parse(decodedData);
  } catch (error) {
    logger.error('Failed to parse Pub/Sub message data:', error);
    throw new CustomError(400, 'Bad request: Invalid JSON in Pub/Sub message');
  }

  // Validate message format
  if (orderCreatedMessage.notificationType !== 'Message' || 
      orderCreatedMessage.type !== 'OrderCreated' ||
      !orderCreatedMessage.order) {
    logger.info('Message is not an OrderCreated message, skipping:', {
      notificationType: orderCreatedMessage.notificationType,
      type: orderCreatedMessage.type
    });
    response.status(204).send();
    return;
  }

  const order = orderCreatedMessage.order;
  const cartId = order.cart?.id;

  if (!cartId) {
    logger.warn('Order has no cart ID, skipping abandoned cart update:', order.id);
    response.status(204).send();
    return;
  }

  logger.info(`Processing OrderCreated event for order ${order.id} from cart ${cartId}`);

  try {
    // Look for abandoned cart custom object with the cart ID as key
    const customObjectResponse = await createApiRoot()
      .customObjects()
      .withContainerAndKey({
        container: 'abandoned-carts',
        key: cartId,
      })
      .get()
      .execute();

    const customObject = customObjectResponse.body;
    
    // Update the custom object with conversion timestamp
    const updatedValue = {
      ...customObject.value,
      cartConvertedDate: order.createdAt,
    };

    await createApiRoot()
      .customObjects()
      .post({
        body: {
          container: 'abandoned-carts',
          key: cartId,
          version: customObject.version,
          value: updatedValue,
        },
      })
      .execute();

    logger.info(`Successfully updated abandoned cart custom object ${cartId} with conversion timestamp: ${order.createdAt}`);

  } catch (error) {
    if (error instanceof Error && 'statusCode' in error && (error as any).statusCode === 404) {
      logger.info(`No abandoned cart custom object found for cart ${cartId}, skipping update`);
    } else {
      logger.error(`Failed to update abandoned cart custom object for cart ${cartId}:`, error);
      // Don't throw error - we don't want to fail the entire process if this update fails
    }
  }

  // Return success response
  response.status(204).send();
};
