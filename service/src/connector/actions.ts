import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';

/**
 * The Type that carries the `abandoned` flag on a Cart.
 *
 * The flag is what keeps a cart from being recorded twice, and it is what a
 * Cart Discount matches on: a discount with the predicate
 * `custom.abandoned = true` is the incentive in the email, and it can only
 * exist if carts carry this field.
 */
export const ABANDONED_CART_TYPE_KEY = 'abandoned-cart-custom';

/**
 * Create the Type, or leave an existing one alone.
 *
 * Deliberately not delete-and-recreate. Deleting a Type detaches it from
 * every Cart already carrying it, so a redeploy would silently un-mark every
 * cart this connector has ever recorded and mail all of those shoppers again.
 */
export async function createAbandonedCartType(
  apiRoot: ByProjectKeyRequestBuilder
): Promise<void> {
  const {
    body: { results: types },
  } = await apiRoot
    .types()
    .get({
      queryArgs: {
        where: `key = "${ABANDONED_CART_TYPE_KEY}"`,
      },
    })
    .execute();

  if (types.length > 0) {
    return;
  }

  await apiRoot
    .types()
    .post({
      body: {
        key: ABANDONED_CART_TYPE_KEY,
        name: {
          en: 'Abandoned cart',
        },
        description: {
          en: 'Marks a Cart that the abandoned-cart connector has recorded.',
        },
        resourceTypeIds: ['order'],
        fieldDefinitions: [
          {
            type: { name: 'Boolean' },
            name: 'abandoned',
            label: { en: 'Abandoned' },
            required: false,
          },
        ],
      },
    })
    .execute();
}

/**
 * Left in place on undeploy.
 *
 * Carts still reference it, and a Type cannot be deleted while anything
 * carries it. Removing the connector should not rewrite the Project's carts.
 */
export async function deleteAbandonedCartType(): Promise<void> {
  return;
}
