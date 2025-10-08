import { logger } from '../utils/logger.utils.js';
import { HTTP_STATUS_SUCCESS_ACCEPTED } from '../constants/http-status.constants.js';
import {
  doValidation,
  isAbandonedCartMessage,
} from '../validators/message.validators.js';
import { decodeToJson } from '../utils/decoder.utils.js';
import HandlerFactory from '../factory/handler.factory.js';
import { HANDLER_TYPE_ABANDONED_CART } from '../constants/handler-type.constants.js';

/**
 * Exposed event POST endpoint.
 * Receives the Pub/Sub message and works with it
 *
 * @typedef {import("express").Response} Response
 * @typedef {import("express").Request} Request
 *
 * @param {Request} request The express request
 * @param {Response} response The express response
 * @returns
 */
export const messageHandler = async (request, response) => {
  // Send ACCEPTED acknowledgement to Subscription
  response.status(HTTP_STATUS_SUCCESS_ACCEPTED).send();

  try {
    // Check request body
    doValidation(request);

    const encodedMessageBody = request.body.message.data;
    const messageBody = decodeToJson(encodedMessageBody);
    const handlerFactory = new HandlerFactory();
    
    if (isAbandonedCartMessage(messageBody)) {
      const handler = handlerFactory.getHandler(HANDLER_TYPE_ABANDONED_CART);
      await handler.process(messageBody);
    } else {
      logger.warn('Message is not an abandoned cart notification:', messageBody);
    }
  } catch (err) {
    if (err.statusCode !== HTTP_STATUS_SUCCESS_ACCEPTED) {
      logger.error('Error processing abandoned cart notification:', err.message);
      logger.error('Error stack:', err.stack);
    } else {
      logger.info(err);
    }
  }
};
