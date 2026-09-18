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
 * Receives the Pub/Sub message and sends the email.
 *
 * The work happens before the acknowledgement, not after. Acknowledging
 * first looks safer — it can never miss the 10-second window — but the
 * platform is free to freeze the instance once a response has been sent, so
 * the send that was supposed to follow may simply never run. Handling first
 * is safe here because the handler is idempotent: a redelivery finds
 * `emailSentDate` already set and stops.
 *
 * Every path acknowledges. This Subscription sees every Custom Object write
 * in the Project, so the common case is a message with nothing to do, and a
 * message that cannot be handled will not become handleable by being
 * delivered again for a week.
 */
export const messageHandler = async (request, response) => {
  try {
    doValidation(request);

    const messageBody = decodeToJson(request.body.message.data);

    if (isAbandonedCartMessage(messageBody)) {
      const handler = new HandlerFactory().getHandler(HANDLER_TYPE_ABANDONED_CART);
      await handler.process(messageBody);
    }
  } catch (err) {
    logger.error(`Error processing abandoned cart notification: ${err.message}`);
    logger.error(err.stack);
  }

  response.status(HTTP_STATUS_SUCCESS_ACCEPTED).send();
};
