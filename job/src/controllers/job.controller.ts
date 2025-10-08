import { Request, Response } from 'express';

import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';

/**
 * Exposed job endpoint.
 * Calls the abandoned cart service to process abandoned carts.
 *
 * @param {Request} _request The express request
 * @param {Response} response The express response
 * @returns
 */
export const post = async (_request: Request, response: Response) => {
  try {
    logger.info('Job triggered: Processing abandoned carts...');
    
    // Get the abandoned cart service URL from environment variables
    const serviceUrl = process.env.ABANDONED_CART_SERVICE_URL;
    if (!serviceUrl) {
      throw new Error('ABANDONED_CART_SERVICE_URL environment variable is required');
    }
    const endpoint = '/abandoned-cart/process';
    const url = `${serviceUrl}${endpoint}`;
    
    logger.info(`Calling abandoned cart service: ${url}`);
    
    // Call the abandoned cart service
    const serviceResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!serviceResponse.ok) {
      const errorText = await serviceResponse.text();
      throw new Error(`Service call failed: ${serviceResponse.status} ${errorText}`);
    }
    
    const result = await serviceResponse.json();
    logger.info('Abandoned cart service response:', result);
    
    response.status(200).json({
      success: true,
      message: 'Job completed successfully',
      serviceResult: result,
    });
  } catch (error) {
    logger.error('Job failed:', error);
    throw new CustomError(
      500,
      `Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
