import { 
  getCustomObjectByContainerAndKey, 
  getCartById,
  getCustomerById,
  updateCustomObject
} from '../client/query.client.js';
import GenericHandler from '../handlers/generic.handler.js';
import { logger } from '../utils/logger.utils.js';
import CustomError from '../errors/custom.error.js';
import { HTTP_STATUS_BAD_REQUEST } from '../constants/http-status.constants.js';

class AbandonedCartHandler extends GenericHandler {
  constructor() {
    super();
  }

  async process(messageBody) {
    try {
      // Extract container and key from the message
      const container = messageBody.resourceUserProvidedIdentifiers?.containerAndKey?.container;
      const key = messageBody.resourceUserProvidedIdentifiers?.containerAndKey?.key;
      
      if (!container || !key) {
        throw new CustomError(
          HTTP_STATUS_BAD_REQUEST,
          'Missing container or key in abandoned cart message'
        );
      }

      logger.info(`Processing abandoned cart notification for container: ${container}, key: ${key}`);

      // Fetch the abandoned cart custom object
      const abandonedCartObject = await getCustomObjectByContainerAndKey(container, key);
      
      if (!abandonedCartObject) {
        throw new CustomError(
          HTTP_STATUS_BAD_REQUEST,
          `Unable to fetch abandoned cart object with container: ${container}, key: ${key}`
        );
      }

      const abandonedCartData = abandonedCartObject.value;
      const cartId = abandonedCartData.cartId;

      if (!cartId) {
        throw new CustomError(
          HTTP_STATUS_BAD_REQUEST,
          'Missing cartId in abandoned cart object'
        );
      }

      // Fetch the cart details
      const cart = await getCartById(cartId);
      
      if (!cart) {
        throw new CustomError(
          HTTP_STATUS_BAD_REQUEST,
          `Unable to fetch cart with ID: ${cartId}`
        );
      }

      // Fetch the customer details
      const customerId = cart.customerId;
      if (!customerId) {
        throw new CustomError(
          HTTP_STATUS_BAD_REQUEST,
          `Cart ${cartId} has no customer ID`
        );
      }

      const customer = await getCustomerById(customerId);
      
      if (!customer) {
        throw new CustomError(
          HTTP_STATUS_BAD_REQUEST,
          `Unable to fetch customer with ID: ${customerId}`
        );
      }

      // Fetch the configuration custom object
      const configuration = await getCustomObjectByContainerAndKey('abandoned-cart', 'configuration');
      
      if (!configuration) {
        throw new CustomError(
          HTTP_STATUS_BAD_REQUEST,
          'Unable to fetch email configuration'
        );
      }

      const configData = configuration.value;
      const emailSubject = configData.emailSubject;
      let emailTemplate = configData.emailTemplate;

      // Replace [firstName] in template with customer's first name
      if (emailTemplate && customer.firstName) {
        emailTemplate = emailTemplate.replace(/\[firstName\]/g, customer.firstName);
      }

      // Prepare email data
      const emailData = {
        customerEmail: abandonedCartData.customerEmail,
        cartTotal: abandonedCartData.cartTotal,
        cartId: cartId,
        abandonmentDate: abandonedCartData.abandonmentDate,
        currencyCode: abandonedCartData.currencyCode,
        emailSubject: emailSubject,
        emailTemplate: emailTemplate,
        // Customer details
        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        customerId: customerId,
        // Additional cart details
        cartLineItems: cart.lineItems?.length || 0,
        cartCreatedAt: cart.createdAt,
        cartLastModifiedAt: cart.lastModifiedAt,
      };

      logger.info(
        `Ready to send abandoned cart email: customerEmail=${emailData.customerEmail}, customerFirstName=${emailData.customerFirstName}, cartTotal=${emailData.cartTotal}, cartId=${cartId}`
      );

      // Send the email using the generic handler's sendMail method
      await super.sendMail(
        process.env.SENDGRID_MAIL_FROM,
        emailData.customerEmail,
        emailSubject, // Using subject as template identifier for now
        emailData
      );

      logger.info(
        `Abandoned cart email has been sent to ${emailData.customerEmail} for cart ${cartId}.`
      );

      // Update the custom object with email sent timestamp
      try {
        const emailSentDate = new Date().toISOString();
        const updatedValue = {
          ...abandonedCartData,
          emailSentDate: emailSentDate,
        };

        await updateCustomObject(
          container,
          key,
          abandonedCartObject.version,
          updatedValue
        );

        logger.info(
          `Updated custom object ${container}/${key} with email sent timestamp: ${emailSentDate}`
        );
      } catch (updateError) {
        logger.error(
          `Failed to update custom object with email sent timestamp: ${updateError.message}`
        );
        // Don't throw error here as email was already sent successfully
      }

    } catch (error) {
      logger.error('Error processing abandoned cart notification:', error.message);
      throw error;
    }
  }
}

export default AbandonedCartHandler;
