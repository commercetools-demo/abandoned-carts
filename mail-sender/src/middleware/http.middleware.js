import readConfiguration from '../utils/config.utils.js';

export const buildHttpMiddlewareOptions = () => ({
  host: `https://api.${readConfiguration().region}.commercetools.com`,
});
