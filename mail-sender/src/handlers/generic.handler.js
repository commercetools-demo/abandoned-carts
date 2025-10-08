import CustomError from '../errors/custom.error.js';
import { HTTP_STATUS_SERVER_ERROR } from '../constants/http-status.constants.js';
import { logger } from '../utils/logger.utils.js';
import sgMail from '@sendgrid/mail';

class GenericHandler {
  async sendMail(
    senderEmailAddress,
    recipientEmailAddress,
    templateId,
    templateData
  ) {
    try {
      logger.info(`Preparing to send email to: ${recipientEmailAddress}`);
      logger.info(`From: ${process.env.SENDGRID_MAIL_FROM}`);
      logger.info(`Reply-To: ${process.env.SENDGRID_MAIL_FROM}`);
      logger.info(`Subject: ${templateId}`);

      // Log SendGrid configuration
      logger.info(`SendGrid API Key: ${process.env.SENDGRID_API_KEY ? '[SET]' : '[NOT SET]'}`);
      logger.info(`SendGrid Mail From: ${process.env.SENDGRID_MAIL_FROM}`);

      // Set SendGrid API key
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      // Prepare email content
      let htmlContent = '';
      let textContent = '';

      // If templateData contains emailTemplate, use it as HTML content
      if (templateData.emailTemplate) {
        htmlContent = templateData.emailTemplate;
        // Create a simple text version by stripping HTML tags
        textContent = templateData.emailTemplate.replace(/<[^>]*>/g, '');
      } else {
        // Fallback: create simple HTML from template data
        htmlContent = this.generateHtmlFromTemplateData(templateData);
        textContent = this.generateTextFromTemplateData(templateData);
      }

      // Prepare SendGrid message
      const msg = {
        to: recipientEmailAddress,
        from: process.env.SENDGRID_MAIL_FROM,
        replyTo: process.env.SENDGRID_MAIL_FROM,
        subject: templateId, // Using templateId as subject for now
        text: textContent,
        html: htmlContent,
      };

      // Send email using SendGrid
      const response = await sgMail.send(msg);
      
      logger.info(`Email sent successfully to ${recipientEmailAddress}`);
      logger.info(`SendGrid Response: ${JSON.stringify(response)}`);
      
      return response;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new CustomError(
        HTTP_STATUS_SERVER_ERROR,
        `Failed to send email: ${error.message}`
      );
    }
  }

  generateHtmlFromTemplateData(templateData) {
    let html = '<html><body>';
    
    // Add customer information
    if (templateData.customerEmail) {
      html += `<h2>Hello!</h2>`;
    }
    
    // Add cart information
    if (templateData.cartTotal) {
      html += `<p><strong>Cart Total:</strong> ${templateData.cartTotal} ${templateData.currencyCode || 'USD'}</p>`;
    }
    
    if (templateData.cartId) {
      html += `<p><strong>Cart ID:</strong> ${templateData.cartId}</p>`;
    }
    
    if (templateData.abandonmentDate) {
      const date = new Date(templateData.abandonmentDate).toLocaleDateString();
      html += `<p><strong>Abandoned on:</strong> ${date}</p>`;
    }
    
    // Add line items count if available
    if (templateData.cartLineItems) {
      html += `<p><strong>Items in cart:</strong> ${templateData.cartLineItems}</p>`;
    }
    
    html += '</body></html>';
    return html;
  }

  generateTextFromTemplateData(templateData) {
    let text = 'Hello!\n\n';
    
    if (templateData.cartTotal) {
      text += `Cart Total: ${templateData.cartTotal} ${templateData.currencyCode || 'USD'}\n`;
    }
    
    if (templateData.cartId) {
      text += `Cart ID: ${templateData.cartId}\n`;
    }
    
    if (templateData.abandonmentDate) {
      const date = new Date(templateData.abandonmentDate).toLocaleDateString();
      text += `Abandoned on: ${date}\n`;
    }
    
    if (templateData.cartLineItems) {
      text += `Items in cart: ${templateData.cartLineItems}\n`;
    }
    
    return text;
  }

  process() {
    // Write the actual implementation in inherited handlers
    throw new CustomError(
      HTTP_STATUS_SERVER_ERROR,
      `Missing actual implementation in message handler`
    );
  }
}
export default GenericHandler;
