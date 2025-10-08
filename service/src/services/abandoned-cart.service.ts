import { createApiRoot } from '../client/create.client';
import { logger } from '../utils/logger.utils';
import CustomError from '../errors/custom.error';

const ABANDONED_CARTS_CONTAINER = 'abandoned-carts';
const ABANDONED_CART_CUSTOM_TYPE_KEY = 'abandoned-cart-custom';

/**
 * Service function to process abandoned carts
 * Queries for carts where custom field 'abandoned' is not true,
 * and creates custom objects for each abandoned cart
 */
export const processAbandonedCarts = async () => {
  const startTime = new Date();
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalFetched = 0;
  
  try {
    logger.info('Starting abandoned cart processing...');
    
    // First, fetch the configuration
    logger.info('Fetching configuration...');
    const configuration = await fetchConfiguration();
    
    logger.info('Configuration loaded:', configuration);
    
    // Extract configuration values - fail if not provided
    if (configuration.abandonAfterHours === undefined || configuration.abandonAfterHours === null || 
        configuration.ignoreCartsOlderThan === undefined || configuration.ignoreCartsOlderThan === null) {
      throw new CustomError(400, 'Configuration is incomplete. Both abandonAfterHours and ignoreCartsOlderThan must be provided.');
    }
    
    const abandonAfterHours = parseInt(configuration.abandonAfterHours);
    const ignoreCartsOlderThanDays = parseInt(configuration.ignoreCartsOlderThan);
    
    logger.info(`Parsed configuration values: abandonAfterHours=${abandonAfterHours}, ignoreCartsOlderThanDays=${ignoreCartsOlderThanDays}`);
    
    if (isNaN(abandonAfterHours) || isNaN(ignoreCartsOlderThanDays)) {
      throw new CustomError(400, 'Configuration values must be valid numbers.');
    }
    
    if (abandonAfterHours < 0 || ignoreCartsOlderThanDays < 0) {
      throw new CustomError(400, 'Configuration values must be non-negative numbers.');
    }
    
    logger.info(`Using configuration: abandon after ${abandonAfterHours} hours, ignore carts older than ${ignoreCartsOlderThanDays} days`);
    
    let offset = 0;
    const limit = 100;
    
    while (true) {
      logger.info(`Fetching carts batch: offset=${offset}, limit=${limit}`);
      
      // Calculate date boundaries for the query
      const now = new Date();
      const abandonAfterDate = new Date(now.getTime() - (abandonAfterHours * 60 * 60 * 1000));
      const ignoreBeforeDate = new Date(now.getTime() - (ignoreCartsOlderThanDays * 24 * 60 * 60 * 1000));
      
      // Build where clause with date parameters and abandoned field filter
      const whereClause = [
        'cartState = "Active"',
        `lastModifiedAt < "${abandonAfterDate.toISOString()}"`,
        `lastModifiedAt > "${ignoreBeforeDate.toISOString()}"`,
        'custom(fields(abandoned != true))'
      ].join(' and ');
      
      logger.info(`Using where clause: ${whereClause}`);
      
      // Fetch carts using CommerceTools SDK with date and abandoned field filters
      const cartsResponse = await createApiRoot()
        .carts()
        .get({
          queryArgs: {
            limit,
            offset,
            where: whereClause,
          },
        })
        .execute();
      
      const carts = cartsResponse.body.results || [];
      const totalCarts = cartsResponse.body.total || 0;
      
      logger.info(`Found ${carts.length} Active carts in this batch (total: ${totalCarts})`);
      totalFetched += carts.length;
      
      if (carts.length === 0) {
        break; // No more carts to process
      }
      
      // Process each cart (date filtering is now done at query level)
      for (const cart of carts) {
        totalProcessed++;
        
        try {
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
                container: ABANDONED_CARTS_CONTAINER,
                key: cart.id, // Use cart ID as key
                value: customObjectData,
              },
            })
            .execute();
          
          // Update cart to set abandoned custom field to true
          try {
            await createApiRoot()
              .carts()
              .withId({ ID: cart.id })
              .post({
                body: {
                  version: cart.version,
                  actions: [
                    {
                      action: 'setCustomType',
                      type: {
                        typeId: 'type',
                        key: ABANDONED_CART_CUSTOM_TYPE_KEY,
                      },
                      fields: {
                        abandoned: true,
                      },
                    },
                  ],
                },
              })
              .execute();
            
            logger.info(`Set abandoned custom field to true for cart ${cart.id}`);
          } catch (updateError) {
            logger.error(`Failed to update abandoned custom field for cart ${cart.id}:`, updateError);
            // Don't fail the entire process if cart update fails
          }
          
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
    
    // Create service log custom object
    const endTime = new Date();
    const serviceLogData = {
      lastRunTime: endTime.toISOString(),
      cartsFetched: totalFetched,
      abandonedCartObjectsCreated: totalCreated,
      processingDuration: endTime.getTime() - startTime.getTime(),
      configuration: {
        abandonAfterHours,
        ignoreCartsOlderThanDays,
      },
    };
    
    try {
      await createApiRoot()
        .customObjects()
        .post({
          body: {
            container: 'abandoned-cart',
            key: 'service-log',
            value: serviceLogData,
          },
        })
        .execute();
      
      logger.info('Service log custom object created successfully');
    } catch (error) {
      logger.error('Failed to create service log custom object:', error);
      // Don't fail the entire process if service log creation fails
    }
    
    logger.info(`Abandoned cart processing completed. Processed: ${totalProcessed}, Created: ${totalCreated}, Fetched: ${totalFetched}`);
    
    return {
      success: true,
      totalProcessed,
      totalCreated,
      totalFetched,
      configuration: {
        abandonAfterHours,
        ignoreCartsOlderThanDays,
      },
      message: `Successfully processed ${totalProcessed} Active carts and created ${totalCreated} abandoned cart records. Fetched ${totalFetched} total Active carts. Used configuration: abandon after ${abandonAfterHours} hours, ignore carts older than ${ignoreCartsOlderThanDays} days.`,
    };
    
  } catch (error) {
    logger.error('Error in abandoned cart processing:', error);
    logger.error('Full error object:', error);
    
    // Create service log even on error
    const endTime = new Date();
    const serviceLogData = {
      lastRunTime: endTime.toISOString(),
      cartsFetched: totalFetched,
      abandonedCartObjectsCreated: totalCreated,
      processingDuration: endTime.getTime() - startTime.getTime(),
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error',
    };
    
    try {
      await createApiRoot()
        .customObjects()
        .post({
          body: {
            container: 'abandoned-cart',
            key: 'service-log',
            value: serviceLogData,
          },
        })
        .execute();
      
      logger.info('Service log custom object created (with error status)');
    } catch (logError) {
      logger.error('Failed to create service log custom object:', logError);
    }
    
    // Extract more detailed error information
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
      totalFetched,
      totalCreated,
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
    
    if (!response.body || !response.body.value) {
      throw new CustomError(404, 'Configuration custom object not found. Please configure the abandoned cart settings.');
    }
    
    // Parse configuration value if it's a JSON string
    let configValue = response.body.value;
    if (typeof configValue === 'string') {
      try {
        configValue = JSON.parse(configValue);
      } catch (parseError) {
        throw new CustomError(400, 'Configuration value is not valid JSON.');
      }
    }
    
    return configValue;
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    
    // Handle CommerceTools API errors
    if ((error as any).statusCode === 404) {
      throw new CustomError(404, 'Configuration custom object not found. Please configure the abandoned cart settings.');
    }
    
    logger.error('Error fetching configuration:', error);
    throw new CustomError(500, `Failed to fetch configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
