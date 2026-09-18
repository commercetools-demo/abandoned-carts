import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { processAbandonedCartsController } from '../controllers/abandoned-cart.controller';

const abandonedCartRouter = Router();

const health = (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
  res.status(200).json({
    success: true,
    service: 'abandoned-cart-service',
    message: 'Abandoned cart service is running',
    timestamp: new Date().toISOString(),
  });
};

// Connect reports this application's URL as {host}/abandoned-cart, so the
// bare path answers rather than 404s — reaching it is the first thing anyone
// tries when the Merchant Center says it cannot see the service.
abandonedCartRouter.get('/', health);
abandonedCartRouter.get('/test', health);

abandonedCartRouter.post('/process', async (req, res, next) => {
  logger.info('Abandoned cart processing requested');
  try {
    await processAbandonedCartsController(req, res);
  } catch (error) {
    next(error);
  }
});

export default abandonedCartRouter;
