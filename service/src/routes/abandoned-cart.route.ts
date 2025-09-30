import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { processAbandonedCartsController } from '../controllers/abandoned-cart.controller';

const abandonedCartRouter = Router();

abandonedCartRouter.post('/process', async (req, res, next) => {
  logger.info('Abandoned cart processing endpoint called');

  try {
    await processAbandonedCartsController(req, res);
  } catch (error) {
    next(error);
  }
});

export default abandonedCartRouter;
