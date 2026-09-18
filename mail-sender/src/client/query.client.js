import { createApiRoot } from './create.client.js';

export async function getCustomObjectByContainerAndKey(container, key) {
  return await createApiRoot()
    .customObjects()
    .withContainerAndKey({
      container: container,
      key: key,
    })
    .get()
    .execute()
    .then((response) => response.body);
}

export async function getCartById(cartId) {
  return await createApiRoot()
    .carts()
    .withId({
      ID: cartId,
    })
    .get()
    .execute()
    .then((response) => response.body);
}

export async function getCustomerById(customerId) {
  return await createApiRoot()
    .customers()
    .withId({
      ID: customerId,
    })
    .get()
    .execute()
    .then((response) => response.body);
}

/**
 * Custom Objects are written through the collection, not through
 * `withContainerAndKey` — that builder only reads and deletes. Posting to it
 * throws before a request is ever made, which is invisible from the outside:
 * the email goes out and nothing records that it did, so the next delivery
 * of the same message sends it again.
 */
export async function updateCustomObject(container, key, version, value) {
  return await createApiRoot()
    .customObjects()
    .post({
      body: {
        container: container,
        key: key,
        version: version,
        value: value,
      },
    })
    .execute()
    .then((response) => response.body);
}
