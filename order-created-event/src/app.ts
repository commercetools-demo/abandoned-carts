import * as dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import bodyParser from 'body-parser';

// Import routes
import EventRoutes from './routes/event.route';

import { readConfiguration } from './utils/config.utils';
import { errorMiddleware } from './middleware/error.middleware';
import CustomError from './errors/custom.error';

// Read env variables
readConfiguration();

// Create the express app
const app: Express = express();
app.disable('x-powered-by');

// Define configurations
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Must match `endpoint` for this application in connect.yaml: Connect
// delivers the Pub/Sub push to {assigned-url}/{endpoint}, so a route
// mounted anywhere else answers 404 to every message.
app.use('/order-created-event', EventRoutes);
app.use('*', () => {
  throw new CustomError(404, 'Path not found.');
});

// Global error handler
app.use(errorMiddleware);

export default app;
