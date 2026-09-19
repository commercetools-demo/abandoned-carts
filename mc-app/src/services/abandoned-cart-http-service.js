import React from 'react';

/**
 * Talking to the abandoned cart service.
 *
 * The service is a separate Connect application with its own URL, handed to
 * this one as ABANDONED_CART_SERVICE_URL at deployment and carried into the
 * browser by `additionalEnv` in custom-application-config.mjs — a container
 * variable the config does not name never reaches this code.
 *
 * Paths are resolved with `new URL` against that value so it works whether
 * it was configured as the origin or as the full endpoint URL Connect
 * reports — the two differ by a path segment, and getting it wrong is a 404
 * that reads like an outage.
 */
export const getServiceUrl = () => window.app?.abandonedCartServiceUrl || '';

const serviceUrl = (path) => {
  const base = getServiceUrl();
  if (!base) {
    throw new Error(
      'The service URL is not configured. Set ABANDONED_CART_SERVICE_URL on the deployment.'
    );
  }
  return new URL(path, base).toString();
};

const callService = async (path, options = {}) => {
  const url = serviceUrl(path);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 300)}`);
  }

  return response.json();
};

export const testAbandonedCartService = async () => {
  try {
    const data = await callService('/abandoned-cart/test', { method: 'GET' });
    return {
      success: true,
      message: 'Service connection test successful',
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: `Service connection test failed: ${error.message}`,
      error: error.message,
    };
  }
};

export const processAbandonedCarts = async () => {
  try {
    const data = await callService('/abandoned-cart/process', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return {
      success: true,
      message: data.message || 'Abandoned carts processed successfully',
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to process abandoned carts: ${error.message}`,
      error: error.message,
    };
  }
};

export const useAbandonedCartHttpService = () => {
  const [loading, setLoading] = React.useState(false);

  const run = (fn) => async () => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  };

  return {
    executeService: run(processAbandonedCarts),
    testService: run(testAbandonedCartService),
    loading,
  };
};
