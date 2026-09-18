import CustomError from '../errors/custom.error.js';
import {
  HTTP_STATUS_BAD_REQUEST,
} from '../constants/http-status.constants.js';

/**
 * Is this one of ours?
 *
 * The Subscription is a Change Subscription on `key-value-document`, which
 * cannot be filtered by container, so every Custom Object write in the
 * Project arrives here. This runs before anything is fetched.
 */
export function isAbandonedCartMessage(messageBody) {
  return (
    messageBody.notificationType === 'ResourceCreated' &&
    messageBody.resource?.typeId === 'key-value-document' &&
    messageBody.resourceUserProvidedIdentifiers?.containerAndKey?.container === 'abandoned-carts'
  );
}

export function doValidation(request) {
  if (!request.body?.message?.data) {
    throw new CustomError(
      HTTP_STATUS_BAD_REQUEST,
      'Bad request: no Pub/Sub message data was received'
    );
  }
}
