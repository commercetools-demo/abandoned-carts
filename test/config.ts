/**
 * Shared configuration for custom object operations
 */

export const CUSTOM_OBJECT_CONFIG = {
  CONTAINER: 'abandoned-carts',
  KEY: '12345',
} as const;

export const ABANDONED_CART_PUBSUB_CONFIG = {
  PROJECT_ID: 'ct-sales-207211',
  TOPIC_NAME: 'cb-custom-object',
  SUBSCRIPTION_NAME: 'cb-custom-object-subscription',
} as const;

export const ORDER_CREATED_PUBSUB_CONFIG = {
  PROJECT_ID: 'ct-sales-207211',
  TOPIC_NAME: 'cb-order-created',
  SUBSCRIPTION_NAME: 'cb-order-created-subscription',
} as const;
