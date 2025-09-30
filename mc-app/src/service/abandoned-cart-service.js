import { useMcQuery, useMcMutation } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchCartsQuery from './fetch-carts.ctp.graphql';
import CreateAbandonedCartMutation from './create-abandoned-cart.ctp.graphql';
import FetchConfigurationQuery from '../hooks/use-configuration-connector/fetch-configuration.ctp.graphql';

const CONTAINER = 'abandoned-carts';

/**
 * Service function to process abandoned carts
 * Queries for carts where custom field 'abandoned' is not true,
 * and creates custom objects for each abandoned cart
 */
export const processAbandonedCarts = async (apolloClient) => {
  try {
    console.log('Starting abandoned cart processing...');
    
    // First, fetch the configuration
    console.log('Fetching configuration...');
    const { data: configData } = await apolloClient.query({
      query: FetchConfigurationQuery,
      variables: {
        container: 'abandoned-cart',
        key: 'configuration',
      },
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      fetchPolicy: 'network-only',
    });
    
    const configuration = configData?.customObject?.value || {};
    console.log('Configuration loaded:', configuration);
    
    // Extract configuration values with defaults
    const abandonAfterHours = parseInt(configuration.abandonAfterHours) || 24;
    const ignoreCartsOlderThanDays = parseInt(configuration.ignoreCartsOlderThan) || 30;
    
    console.log(`Using configuration: abandon after ${abandonAfterHours} hours, ignore carts older than ${ignoreCartsOlderThanDays} days`);
    
    let totalProcessed = 0;
    let totalCreated = 0;
    let offset = 0;
    const limit = 100;
    
    while (true) {
      console.log(`Fetching carts batch: offset=${offset}, limit=${limit}`);
      
      // Fetch carts using Apollo Client
      const { data } = await apolloClient.query({
        query: FetchCartsQuery,
        variables: {
          limit,
          offset,
        },
        context: {
          target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
        },
        fetchPolicy: 'network-only', // Always fetch fresh data
      });
      
      const carts = data?.carts?.results || [];
      const totalCarts = data?.carts?.total || 0;
      
      console.log(`Found ${carts.length} carts in this batch (total: ${totalCarts})`);
      
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
            console.log(`Cart ${cart.id} is too recent (${hoursSinceLastModified.toFixed(1)} hours < ${abandonAfterHours} hours), skipping`);
            continue;
          }
          
          // Check if cart is too old to process (ignore very old carts)
          if (daysSinceLastModified > ignoreCartsOlderThanDays) {
            console.log(`Cart ${cart.id} is too old (${daysSinceLastModified.toFixed(1)} days > ${ignoreCartsOlderThanDays} days), skipping`);
            continue;
          }
          
          // Check if customer email exists
          if (!cart.customerEmail) {
            console.log(`Cart ${cart.id} has no customer email, skipping`);
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
          
          console.log(`Creating abandoned cart object for cart ${cart.id}...`);
          
          // Create custom object
          const result = await apolloClient.mutate({
            mutation: CreateAbandonedCartMutation,
            variables: {
              container: CONTAINER,
              key: cart.id, // Use cart ID as key
              value: JSON.stringify(customObjectData),
            },
            context: {
              target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
            },
          });
          
          totalCreated++;
          console.log(`Successfully created abandoned cart object for cart ${cart.id} (${cart.customerEmail})`);
          
        } catch (error) {
          console.error(`Error processing cart ${cart.id}:`, error);
          console.error('Error details:', error.message);
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
    
    console.log(`Abandoned cart processing completed. Processed: ${totalProcessed}, Created: ${totalCreated}`);
    
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
    console.error('Error in abandoned cart processing:', error);
    console.error('Full error object:', error);
    
    // Extract more detailed error information
    let errorMessage = error.message;
    if (error.graphQLErrors && error.graphQLErrors.length > 0) {
      errorMessage = error.graphQLErrors.map(err => err.message).join(', ');
    } else if (error.networkError) {
      errorMessage = `Network error: ${error.networkError.message}`;
    }
    
    return {
      success: false,
      error: errorMessage,
      message: `Failed to process abandoned carts: ${errorMessage}`,
    };
  }
};

/**
 * Hook to use the abandoned cart service
 */
export const useAbandonedCartService = () => {
  const [createAbandonedCart, { loading: createLoading }] = useMcMutation(
    CreateAbandonedCartMutation
  );
  
  const executeService = async (apolloClient) => {
    return await processAbandonedCarts(apolloClient);
  };
  
  return {
    executeService,
    loading: createLoading,
  };
};
