import { createApiRoot } from '../client/create.client';
import { logger } from '../utils/logger.utils';
import CustomError from '../errors/custom.error';

const CONTAINER = 'abandoned-carts';

/**
 * Service function to process abandoned carts
 * Queries for carts where custom field 'abandoned' is not true,
 * and creates custom objects for each abandoned cart
 */
export const processAbandonedCarts = async () => {
  try {
    logger.info('Starting abandoned cart processing...');
    
    // First, fetch the configuration
    logger.info('Fetching configuration...');
    const configuration = await fetchConfiguration();
    
    logger.info('Configuration loaded:', configuration);
    
    // Extract configuration values with defaults
    const abandonAfterHours = parseInt(configuration.abandonAfterHours) || 24;
    const ignoreCartsOlderThanDays = parseInt(configuration.ignoreCartsOlderThan) || 30;
    
    logger.info(`Using configuration: abandon after ${abandonAfterHours} hours, ignore carts older than ${ignoreCartsOlderThanDays} days`);
    
    let totalProcessed = 0;
    let totalCreated = 0;
    let offset = 0;
    const limit = 100;
    
    while (true) {
      logger.info(`Fetching carts batch: offset=${offset}, limit=${limit}`);
      
      // Fetch carts using CommerceTools SDK
      const cartsResponse = await createApiRoot()
        .carts()
        .get({
          queryArgs: {
            limit,
            offset,
          },
        })
        .execute();
      
      const carts = cartsResponse.body.results || [];
      const totalCarts = cartsResponse.body.total || 0;
      
      logger.info(`Found ${carts.length} carts in this batch (total: ${totalCarts})`);
      
      if (carts.length === 0) {
        break; // No more carts to process
      }
      
      // Process each cart
      for (const cart of carts) {
        totalProcessed++;
        
        try {
          // Check if cart is actually abandoned based on configuration
          const cartAge = Date.now() - new Date(cart.lastModifiedAt).getTime();
          const hoursSinceLastModified = cartAge / (1000 * 60 * 60);
          const daysSinceLastModified = cartAge / (1000 * 60 * 60 * 24);
          
          // Check if cart is too recent to be considered abandoned
          if (hoursSinceLastModified < abandonAfterHours) {
            logger.info(`Cart ${cart.id} is too recent (${hoursSinceLastModified.toFixed(1)} hours < ${abandonAfterHours} hours), skipping`);
            continue;
          }
          
          // Check if cart is too old to process (ignore very old carts)
          if (daysSinceLastModified > ignoreCartsOlderThanDays) {
            logger.info(`Cart ${cart.id} is too old (${daysSinceLastModified.toFixed(1)} days > ${ignoreCartsOlderThanDays} days), skipping`);
            continue;
          }
          
          // Check if customer email exists
          if (!cart.customerEmail) {
            logger.info(`Cart ${cart.id} has no customer email, skipping`);
            continue;
          }
          
          // Calculate cart total
          const cartTotal = cart.totalPrice?.centAmount 
            ? (cart.totalPrice.centAmount / 100).toFixed(2) 
            : '0.00';
          
          // Create custom object data
          const customObjectData = {
            customerEmail: cart.customerEmail,
            cartTotal: cartTotal,
            cartId: cart.id,
            abandonmentDate: cart.lastModifiedAt,
            currencyCode: cart.totalPrice?.currencyCode || 'USD',
          };
          
          logger.info(`Creating abandoned cart object for cart ${cart.id}...`);
          
          // Create custom object
          await createApiRoot()
            .customObjects()
            .post({
              body: {
                container: CONTAINER,
                key: cart.id, // Use cart ID as key
                value: customObjectData,
              },
            })
            .execute();
          
          totalCreated++;
          logger.info(`Successfully created abandoned cart object for cart ${cart.id} (${cart.customerEmail})`);
          
        } catch (error) {
          logger.error(`Error processing cart ${cart.id}:`, error);
          logger.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
          // Continue with next cart instead of failing the entire process
        }
      }
      
      // Move to next batch
      offset += limit;
      
      // Safety check to prevent infinite loops
      if (offset >= totalCarts) {
        break;
      }
    }
    
    logger.info(`Abandoned cart processing completed. Processed: ${totalProcessed}, Created: ${totalCreated}`);
    
    return {
      success: true,
      totalProcessed,
      totalCreated,
      configuration: {
        abandonAfterHours,
        ignoreCartsOlderThanDays,
      },
      message: `Successfully processed ${totalProcessed} carts and created ${totalCreated} abandoned cart records. Used configuration: abandon after ${abandonAfterHours} hours, ignore carts older than ${ignoreCartsOlderThanDays} days.`,
    };
    
  } catch (error) {
    logger.error('Error in abandoned cart processing:', error);
    logger.error('Full error object:', error);
    
    // Extract more detailed error information
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
      message: `Failed to process abandoned carts: ${errorMessage}`,
    };
  }
};

/**
 * Fetch configuration from custom object
 */
const fetchConfiguration = async () => {
  try {
    const response = await createApiRoot()
      .customObjects()
      .withContainerAndKey({
        container: 'abandoned-cart',
        key: 'configuration',
      })
      .get()
      .execute();
    
    return response.body.value || {};
  } catch (error) {
    logger.warn('Configuration not found, using defaults:', error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
};
