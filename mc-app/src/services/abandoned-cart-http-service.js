import React from 'react';

/**
 * HTTP service for calling the external abandoned cart processor service
 */

/**
 * Get the abandoned cart service URL from environment variables
 */
const getServiceUrl = () => {
  // Get the service URL from environment variables configured in connect.yaml
  // The ABANDONED_CART_SERVICE_URL is defined in connect.yaml and available via window.ENV
  return window.ENV?.ABANDONED_CART_SERVICE_URL || 'http://localhost:8080';
};

/**
 * Make HTTP call to the abandoned cart processor service
 * @param {string} endpoint - The endpoint to call (e.g., '/process', '/test')
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Response from the service
 */
const callAbandonedCartService = async (endpoint, options = {}) => {
  const serviceUrl = getServiceUrl();
  const url = `${serviceUrl}${endpoint}`;
  
  const defaultOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  try {
    console.log(`Calling abandoned cart service: ${url}`);
    console.log(`Service URL from ENV: ${window.ENV?.ABANDONED_CART_SERVICE_URL || 'not set'}`);
    
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Service response:', data);
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error calling abandoned cart service:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Test the abandoned cart service connection
 * @returns {Promise<Object>} - Test result
 */
export const testAbandonedCartService = async () => {
  try {
    console.log('Testing abandoned cart service connection...');
    
    const result = await callAbandonedCartService('/abandoned-cart/test', {
      method: 'GET',
    });
    
    if (result.success) {
      return {
        success: true,
        message: 'Service connection test successful',
        data: result.data,
      };
    } else {
      return {
        success: false,
        message: `Service connection test failed: ${result.error}`,
        error: result.error,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Service connection test failed: ${error.message}`,
      error: error.message,
    };
  }
};

/**
 * Process abandoned carts by calling the external service
 * @returns {Promise<Object>} - Processing result
 */
export const processAbandonedCarts = async () => {
  try {
    console.log('Processing abandoned carts via HTTP service...');
    
    const result = await callAbandonedCartService('/abandoned-cart/process', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    if (result.success) {
      return {
        success: true,
        message: result.data.message || 'Abandoned carts processed successfully',
        data: result.data,
      };
    } else {
      return {
        success: false,
        message: `Failed to process abandoned carts: ${result.error}`,
        error: result.error,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to process abandoned carts: ${error.message}`,
      error: error.message,
    };
  }
};

/**
 * Hook to use the abandoned cart HTTP service
 */
export const useAbandonedCartHttpService = () => {
  const [loading, setLoading] = React.useState(false);
  
  const executeService = async () => {
    setLoading(true);
    try {
      const result = await processAbandonedCarts();
      return result;
    } finally {
      setLoading(false);
    }
  };
  
  const testService = async () => {
    setLoading(true);
    try {
      const result = await testAbandonedCartService();
      return result;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    executeService,
    testService,
    loading,
  };
};
