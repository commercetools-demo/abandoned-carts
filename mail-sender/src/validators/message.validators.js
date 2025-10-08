import CustomError from '../errors/custom.error.js';
import { decodeToJson } from '../utils/decoder.utils.js';
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_SUCCESS_ACCEPTED,
} from '../constants/http-status.constants.js';
import readConfiguration from '../utils/config.utils.js';

export function isSelfCreatedChange(messageBody) {
  const resourceModifiedBy = messageBody.createdBy?.clientId;
  const currentConnectorClientId = readConfiguration().clientId;
  return resourceModifiedBy === currentConnectorClientId;
}

export function isAbandonedCartMessage(messageBody) {
  return (
    messageBody.notificationType === 'ResourceCreated' &&
    messageBody.resource?.typeId === 'key-value-document' &&
    messageBody.resourceUserProvidedIdentifiers?.containerAndKey?.container === 'abandoned-carts'
  );
}

export function doValidation(request) {
  if (!request.body) {
    throw new CustomError(
      HTTP_STATUS_BAD_REQUEST,
      'Bad request: No Pub/Sub message was received'
    );
  }
  console.log('request', request);
}
