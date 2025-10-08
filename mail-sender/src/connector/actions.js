const EMAIL_DELIVERY_SUBSCRIPTION_KEY =
  'ct-connect-email-delivery-subscription';

async function getEmailDevlierySubscription(apiRoot) {
  const {
    body: { results: subscriptions },
  } = await apiRoot
    .subscriptions()
    .get({
      queryArgs: {
        where: `key = "${EMAIL_DELIVERY_SUBSCRIPTION_KEY}"`,
      },
    })
    .execute();
  return subscriptions;
}

export async function deleteEmailDeliverySubscription(apiRoot) {
  const subscriptions = await getEmailDevlierySubscription(apiRoot);
  if (subscriptions.length > 0) {
    const subscription = subscriptions[0];
    await apiRoot
      .subscriptions()
      .withKey({ key: EMAIL_DELIVERY_SUBSCRIPTION_KEY })
      .delete({
        queryArgs: {
          version: subscription.version,
        },
      })
      .execute();
  }
}

export async function createEmailDeliverySubscripition(
  apiRoot,
  topicName,
  projectId
) {
  await deleteEmailDeliverySubscription(apiRoot);
  await apiRoot
    .subscriptions()
    .post({
      body: {
        key: EMAIL_DELIVERY_SUBSCRIPTION_KEY,
        destination: {
          type: 'GoogleCloudPubSub',
          topic: topicName,
          projectId,
        },
        changes: [{
          resourceTypeId: 'key-value-document',
        }]
      },
    })
    .execute();
}


