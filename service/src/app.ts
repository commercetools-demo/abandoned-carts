import * as dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

// Import routes
import ServiceRoutes from './routes/service.route';
import AbandonedCartRoutes from './routes/abandoned-cart.route';

import { readConfiguration } from './utils/config.utils';
import { errorMiddleware } from './middleware/error.middleware';
import CustomError from './errors/custom.error';

// Read env variables
readConfiguration();

// Create the express app
const app: Express = express();
app.disable('x-powered-by');

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3001', // mc-app development server
    'https://mc.europe-west1.gcp.commercetools.com', // commercetools MC
    'https://mc.us-central1.gcp.commercetools.com', // commercetools MC
    'https://mc.ap-southeast1.gcp.commercetools.com', // commercetools MC
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Define configurations
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.use('/service', ServiceRoutes);
app.use('/abandoned-cart', AbandonedCartRoutes);
app.use('*', () => {
  throw new CustomError(404, 'Path not found.');
});
// Global error handler
app.use(errorMiddleware);

export default app;
