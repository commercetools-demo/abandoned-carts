import { type HttpMiddlewareOptions } from '@commercetools/sdk-client-v2';
import { readConfiguration } from '../utils/config.utils';

export const buildHttpMiddlewareOptions = (): HttpMiddlewareOptions => ({
  host: `https://api.${readConfiguration().region}.commercetools.com`,
});
