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

export async function updateCustomObject(container, key, version, value) {
  return await createApiRoot()
    .customObjects()
    .withContainerAndKey({
      container: container,
      key: key,
    })
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
