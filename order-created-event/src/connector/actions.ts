import {
  AzureServiceBusDestination,
  Destination,
  GoogleCloudPubSubDestination,
} from '@commercetools/platform-sdk';
import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';

/**
 * The Subscription that tells this application an order was placed.
 *
 * OrderCreated is the whole point: it is what turns a recorded abandoned
 * cart into a conversion. The key is namespaced to this connector so it
 * cannot collide with a Project's own order Subscriptions, which commonly
 * exist alongside it.
 */
const ORDER_CREATED_SUBSCRIPTION_KEY = 'abandoned-cart-order-created-subscription';

export async function createGcpPubSubOrderCreatedSubscription(
  apiRoot: ByProjectKeyRequestBuilder,
  topicName: string,
  projectId: string
): Promise<void> {
  const destination: GoogleCloudPubSubDestination = {
    type: 'GoogleCloudPubSub',
    topic: topicName,
    projectId,
  };
  await createSubscription(apiRoot, destination);
}

export async function createAzureServiceBusOrderCreatedSubscription(
  apiRoot: ByProjectKeyRequestBuilder,
  connectionString: string
): Promise<void> {
  const destination: AzureServiceBusDestination = {
    type: 'AzureServiceBus',
    connectionString: connectionString,
  };
  await createSubscription(apiRoot, destination);
}

async function createSubscription(
  apiRoot: ByProjectKeyRequestBuilder,
  destination: Destination
) {
  await deleteOrderCreatedSubscription(apiRoot);
  await apiRoot
    .subscriptions()
    .post({
      body: {
        key: ORDER_CREATED_SUBSCRIPTION_KEY,
        destination,
        messages: [
          {
            resourceTypeId: 'order',
            types: ['OrderCreated'],
          },
        ],
      },
    })
    .execute();
}

export async function deleteOrderCreatedSubscription(
  apiRoot: ByProjectKeyRequestBuilder
): Promise<void> {
  const {
    body: { results: subscriptions },
  } = await apiRoot
    .subscriptions()
    .get({
      queryArgs: {
        where: `key = "${ORDER_CREATED_SUBSCRIPTION_KEY}"`,
      },
    })
    .execute();

  if (subscriptions.length > 0) {
    const subscription = subscriptions[0];

    await apiRoot
      .subscriptions()
      .withKey({ key: ORDER_CREATED_SUBSCRIPTION_KEY })
      .delete({
        queryArgs: {
          version: subscription.version,
        },
      })
      .execute();
  }
}
