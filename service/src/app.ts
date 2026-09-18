import * as dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import AbandonedCartRoutes from './routes/abandoned-cart.route';

import { readConfiguration } from './utils/config.utils';
import { errorMiddleware } from './middleware/error.middleware';
import CustomError from './errors/custom.error';

// Fail at boot rather than on the first request if the credentials Connect
// injected are missing or malformed.
readConfiguration();

const app: Express = express();
app.disable('x-powered-by');

/**
 * The Merchant Center application calls this service from the browser, so
 * the Merchant Center origins have to be allowed. Every region is listed
 * because the connector does not know which one it was deployed into.
 */
const corsOptions = {
  origin: [
    'http://localhost:3001',
    'https://mc.us-central1.gcp.commercetools.com',
    'https://mc.us-east-2.aws.commercetools.com',
    'https://mc.europe-west1.gcp.commercetools.com',
    'https://mc.eu-central-1.aws.commercetools.com',
    'https://mc.australia-southeast1.gcp.commercetools.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/abandoned-cart', AbandonedCartRoutes);
app.use('*', () => {
  throw new CustomError(404, 'Path not found.');
});

app.use(errorMiddleware);

export default app;
