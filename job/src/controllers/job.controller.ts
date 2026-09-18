import { Request, Response } from 'express';

import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';

/**
 * Where the service lives.
 *
 * Connect assigns the service application its URL at deployment, so this
 * value cannot be known when the Connector is written — it is set on the
 * deployment after the first deploy. Resolving through `new URL` with an
 * absolute path means it works whether the configured value is the origin
 * or the full endpoint URL Connect reports, which is the difference between
 * a working schedule and a 404 every five minutes.
 */
function processUrl(): string {
  const configured = process.env.ABANDONED_CART_SERVICE_URL;
  if (!configured) {
    throw new Error(
      'ABANDONED_CART_SERVICE_URL is not set. Set it on the deployment to the service application URL Connect reported.'
    );
  }
  return new URL('/abandoned-cart/process', configured).toString();
}

/**
 * Exposed job endpoint. Runs on the schedule in connect.yaml.
 */
export const post = async (_request: Request, response: Response) => {
  try {
    const url = processUrl();
    logger.info(`Job triggered, calling ${url}`);

    // A job may run for 30 minutes, but a run that has not answered in five
    // is not going to — and the next tick is already due.
    const serviceResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(300_000),
    });

    if (!serviceResponse.ok) {
      const errorText = await serviceResponse.text();
      throw new Error(
        `The service answered HTTP ${serviceResponse.status}: ${errorText.slice(0, 300)}`
      );
    }

    const result = await serviceResponse.json();
    logger.info(`Abandoned cart run finished: ${JSON.stringify(result)}`);

    response.status(200).json({
      success: true,
      message: 'Job completed successfully',
      serviceResult: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Job failed: ${message}`);
    throw new CustomError(500, `Job failed: ${message}`);
  }
};
