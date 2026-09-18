import readConfiguration from '../utils/config.utils.js';

/**
 * Built when a client is created, not when this module is imported.
 *
 * At import time there is no reason for the environment to be populated —
 * a unit test importing a controller pulls this whole chain in — and
 * validating it there turns a missing variable into a module-load crash
 * with a stack that points at the wrong place.
 */
export const buildAuthMiddlewareOptions = () => {
  const { region, projectKey, clientId, clientSecret, scope } = readConfiguration();
  return {
    host: `https://auth.${region}.commercetools.com`,
    projectKey,
    credentials: { clientId, clientSecret },
    // Omitted rather than defaulted: a placeholder scope is not a scope, and
    // the token request fails with invalid_scope rather than falling back.
    scopes: scope ? [scope] : undefined,
  };
};
