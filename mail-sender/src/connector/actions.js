/**
 * The Subscription that tells this application a cart was recorded.
 *
 * It is a Change Subscription on `key-value-document`, which means every
 * Custom Object write in the Project arrives here — Change Subscriptions
 * cannot be filtered by container. `isAbandonedCartMessage` does that
 * filtering, cheaply, before anything is fetched.
 */
const ABANDONED_CART_SUBSCRIPTION_KEY = 'abandoned-cart-created-subscription';

async function getSubscription(apiRoot) {
  const {
    body: { results: subscriptions },
  } = await apiRoot
    .subscriptions()
    .get({
      queryArgs: {
        where: `key = "${ABANDONED_CART_SUBSCRIPTION_KEY}"`,
      },
    })
    .execute();
  return subscriptions;
}

export async function deleteEmailDeliverySubscription(apiRoot) {
  const subscriptions = await getSubscription(apiRoot);
  if (subscriptions.length > 0) {
    const subscription = subscriptions[0];
    await apiRoot
      .subscriptions()
      .withKey({ key: ABANDONED_CART_SUBSCRIPTION_KEY })
      .delete({
        queryArgs: {
          version: subscription.version,
        },
      })
      .execute();
  }
}

export async function createEmailDeliverySubscription(apiRoot, topicName, projectId) {
  await deleteEmailDeliverySubscription(apiRoot);
  await apiRoot
    .subscriptions()
    .post({
      body: {
        key: ABANDONED_CART_SUBSCRIPTION_KEY,
        destination: {
          type: 'GoogleCloudPubSub',
          topic: topicName,
          projectId,
        },
        changes: [
          {
            resourceTypeId: 'key-value-document',
          },
        ],
      },
    })
    .execute();
}
