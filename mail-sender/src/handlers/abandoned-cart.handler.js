import {
  getCustomObjectByContainerAndKey,
  getCartById,
  getCustomerById,
  updateCustomObject,
} from '../client/query.client.js';
import GenericHandler from '../handlers/generic.handler.js';
import { logger } from '../utils/logger.utils.js';
import CustomError from '../errors/custom.error.js';
import { HTTP_STATUS_BAD_REQUEST } from '../constants/http-status.constants.js';

const CONFIG_CONTAINER = 'abandoned-cart';
const DEFAULT_SUBJECT = 'You left something in your cart';

class AbandonedCartHandler extends GenericHandler {
  constructor() {
    super();
  }

  async process(messageBody) {
    const container =
      messageBody.resourceUserProvidedIdentifiers?.containerAndKey?.container;
    const key = messageBody.resourceUserProvidedIdentifiers?.containerAndKey?.key;

    if (!container || !key) {
      throw new CustomError(
        HTTP_STATUS_BAD_REQUEST,
        'Missing container or key in the abandoned cart message'
      );
    }

    logger.info(`Processing abandoned cart ${container}/${key}`);

    const abandonedCartObject = await getCustomObjectByContainerAndKey(container, key);
    if (!abandonedCartObject) {
      throw new CustomError(
        HTTP_STATUS_BAD_REQUEST,
        `No custom object at ${container}/${key}`
      );
    }

    const abandonedCartData = abandonedCartObject.value;

    // Already sent. The Subscription delivers at least once, so a redelivery
    // of the creation message must not mail the same shopper twice.
    if (abandonedCartData.emailSentDate) {
      logger.info(`Cart ${key} was already emailed on ${abandonedCartData.emailSentDate}.`);
      return;
    }

    const cartId = abandonedCartData.cartId;
    if (!cartId) {
      throw new CustomError(HTTP_STATUS_BAD_REQUEST, 'The custom object has no cartId');
    }

    const cart = await getCartById(cartId);
    if (!cart) {
      throw new CustomError(HTTP_STATUS_BAD_REQUEST, `Cannot read cart ${cartId}`);
    }

    // The service resolved the address already — through the customer record
    // when the cart carried none — so this is the address to use. Anything
    // else reintroduces the case where a cart with no customerEmail is
    // recorded and then silently never mailed.
    const recipient = abandonedCartData.customerEmail;
    if (!recipient) {
      throw new CustomError(
        HTTP_STATUS_BAD_REQUEST,
        `The record for cart ${cartId} has no email address`
      );
    }

    // Best effort: a first name makes the email personal, its absence does
    // not make the email wrong.
    let customer = null;
    if (cart.customerId) {
      customer = await getCustomerById(cart.customerId).catch((error) => {
        logger.warn(`Could not read customer ${cart.customerId}: ${error.message}`);
        return null;
      });
    }

    const configuration = await getCustomObjectByContainerAndKey(
      CONFIG_CONTAINER,
      'configuration'
    );
    const configData = configuration?.value ?? {};
    const subject = configData.emailSubject || DEFAULT_SUBJECT;

    let emailTemplate = configData.emailTemplate;
    if (emailTemplate) {
      emailTemplate = emailTemplate.replace(
        /\[firstName\]/g,
        customer?.firstName ?? 'there'
      );
    }

    const result = await this.sendMail(recipient, subject, {
      emailTemplate,
      customerFirstName: customer?.firstName,
      cartTotal: abandonedCartData.cartTotal,
      currencyCode: abandonedCartData.currencyCode,
      abandonmentDate: abandonedCartData.abandonmentDate,
      cartLineItems: cart.lineItems?.length ?? abandonedCartData.lineItemCount ?? 0,
    });

    // The attempt is recorded either way. `emailSentDate` is set only on a
    // real delivery, so a failed send stays visible as "Not sent" in the
    // Merchant Center and the detail says why.
    try {
      await updateCustomObject(container, key, abandonedCartObject.version, {
        ...abandonedCartData,
        ...(result.delivered ? { emailSentDate: new Date().toISOString() } : {}),
        emailAttemptedDate: new Date().toISOString(),
        emailDeliveredTo: result.deliveredTo,
        emailDeliveryDetail: result.detail,
        emailSubject: result.subject,
        emailBody: result.html,
      });
    } catch (error) {
      logger.error(`Could not record the send on ${container}/${key}: ${error.message}`);
    }
  }
}

export default AbandonedCartHandler;
