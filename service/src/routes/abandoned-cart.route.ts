import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { processAbandonedCartsController } from '../controllers/abandoned-cart.controller';

const abandonedCartRouter = Router();

// Test endpoint for CORS and service health check
abandonedCartRouter.get('/test', async (req, res) => {
  logger.info('Abandoned cart service test endpoint called');
  
  res.status(200).json({
    success: true,
    message: 'Abandoned cart service is running',
    timestamp: new Date().toISOString(),
    service: 'abandoned-cart-service',
  });
});

abandonedCartRouter.post('/process', async (req, res, next) => {
  logger.info('Abandoned cart processing endpoint called');

  try {
    await processAbandonedCartsController(req, res);
  } catch (error) {
    next(error);
  }
});

export default abandonedCartRouter;
