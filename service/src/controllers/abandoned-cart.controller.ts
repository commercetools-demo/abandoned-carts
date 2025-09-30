import { Request, Response } from 'express';
import CustomError from '../errors/custom.error';
import { processAbandonedCarts } from '../services/abandoned-cart.service';
import { logger } from '../utils/logger.utils';

/**
 * Handle abandoned cart processing requests
 * This endpoint processes abandoned carts and creates custom objects for them
 *
 * @param {Request} request The express request
 * @param {Response} response The express response
 * @returns
 */
export const processAbandonedCartsController = async (request: Request, response: Response) => {
  try {
    logger.info('Abandoned cart processing request received');
    
    const result = await processAbandonedCarts();
    
    if (result.success) {
      logger.info(`Abandoned cart processing completed successfully: ${result.message}`);
      response.status(200).json(result);
    } else {
      logger.error(`Abandoned cart processing failed: ${result.message}`);
      throw new CustomError(500, result.message);
    }
  } catch (error) {
    logger.error('Error in abandoned cart processing:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError(500, `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
