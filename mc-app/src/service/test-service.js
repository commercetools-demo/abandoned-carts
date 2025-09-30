import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchCartsQuery from './fetch-carts.ctp.graphql';
import FetchConfigurationQuery from '../hooks/use-configuration-connector/fetch-configuration.ctp.graphql';

/**
 * Simple test function to verify the GraphQL query works
 */
export const testCartQuery = async (apolloClient) => {
  try {
    console.log('Testing configuration and cart queries...');
    
    // Test configuration query first
    console.log('Testing configuration query...');
    const { data: configData, error: configError } = await apolloClient.query({
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
    
    if (configError) {
      console.error('Configuration GraphQL Error:', configError);
      return {
        success: false,
        error: configError.message,
        message: `Configuration GraphQL Error: ${configError.message}`,
      };
    }
    
    const configuration = configData?.customObject?.value || {};
    console.log('Configuration loaded:', configuration);
    
    // Test cart query
    console.log('Testing cart query...');
    const { data, error } = await apolloClient.query({
      query: FetchCartsQuery,
      variables: {
        limit: 5,
        offset: 0,
      },
      context: {
        target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
      },
      fetchPolicy: 'network-only',
    });
    
    if (error) {
      console.error('Cart GraphQL Error:', error);
      return {
        success: false,
        error: error.message,
        message: `Cart GraphQL Error: ${error.message}`,
      };
    }
    
    const carts = data?.carts?.results || [];
    console.log(`Successfully fetched ${carts.length} carts`);
    console.log('Sample cart:', carts[0]);
    
    return {
      success: true,
      cartCount: carts.length,
      configuration,
      message: `Successfully fetched ${carts.length} carts and loaded configuration`,
      sampleCart: carts[0],
    };
    
  } catch (error) {
    console.error('Test query error:', error);
    return {
      success: false,
      error: error.message,
      message: `Test failed: ${error.message}`,
    };
  }
};
