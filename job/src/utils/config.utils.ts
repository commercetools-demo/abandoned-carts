/**
 * Read the configuration env vars
 * Simplified for HTTP-only job that calls external service
 *
 * @returns The configuration with the correct env vars
 */
export const readConfiguration = () => {
  const envVars = {
    abandonedCartServiceUrl: process.env.ABANDONED_CART_SERVICE_URL,
  };

  if (!envVars.abandonedCartServiceUrl) {
    throw new Error('ABANDONED_CART_SERVICE_URL environment variable is required');
  }

  return envVars;
};
