import { type AuthMiddlewareOptions } from '@commercetools/sdk-client-v2';

import { readConfiguration } from '../utils/config.utils';

/**
 * Built when a client is created, not when this module is imported, and
 * with no scope rather than a placeholder one.
 *
 * `'default'` is not a scope. Sending it makes the token request fail with
 * `invalid_scope`, and since the SDK only requests a token on the first
 * call, the failure surfaces as an unrelated-looking error deep inside
 * whatever that call was. Omitting `scopes` asks for the API Client's own
 * scopes, which is what the caller wanted.
 */
export const buildAuthMiddlewareOptions = (): AuthMiddlewareOptions => {
  const { region, projectKey, clientId, clientSecret, scope } = readConfiguration();
  return {
    host: `https://auth.${region}.commercetools.com`,
    projectKey,
    credentials: { clientId, clientSecret },
    scopes: scope ? [scope] : undefined,
  };
};
