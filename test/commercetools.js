const { createApiBuilderFromCtpClient } = require('@commercetools/platform-sdk');
const { ClientBuilder, AuthMiddlewareOptions, HttpMiddlewareOptions } = require('@commercetools/sdk-client-v2');
require('dotenv').config();

/**
 * Create API root with environment variables
 */
function createApiRoot() {
  const clientId = process.env.CTP_CLIENT_ID;
  const clientSecret = process.env.CTP_CLIENT_SECRET;
  const projectKey = process.env.CTP_PROJECT_KEY;
  const scopes = process.env.CTP_SCOPES;
  const region = process.env.CTP_REGION || 'europe-west1.gcp';

  if (!clientId || !clientSecret || !projectKey || !scopes) {
    throw new Error('Missing required environment variables: CTP_CLIENT_ID, CTP_CLIENT_SECRET, CTP_PROJECT_KEY, CTP_SCOPES');
  }

  const authMiddlewareOptions = {
    host: `https://auth.${region}.commercetools.com`,
    projectKey,
    credentials: {
      clientId,
      clientSecret,
    },
    scopes: scopes.split(','),
    fetch,
  };

  const httpMiddlewareOptions = {
    host: `https://api.${region}.commercetools.com`,
    fetch,
  };

  const ctpClient = new ClientBuilder()
    .withClientCredentialsFlow(authMiddlewareOptions)
    .withHttpMiddleware(httpMiddlewareOptions)
    .build();

  return createApiBuilderFromCtpClient(ctpClient).withProjectKey({ projectKey });
}

module.exports = {
  createApiRoot,
};
