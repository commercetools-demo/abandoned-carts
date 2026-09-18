import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { buildAuthMiddlewareOptions } from '../middleware/auth.middleware';
import { buildHttpMiddlewareOptions } from '../middleware/http.middleware';
import { readConfiguration } from '../utils/config.utils';

export const createClient = () =>
  new ClientBuilder()
    .withProjectKey(readConfiguration().projectKey)
    .withClientCredentialsFlow(buildAuthMiddlewareOptions())
    .withHttpMiddleware(buildHttpMiddlewareOptions())
    .build();
