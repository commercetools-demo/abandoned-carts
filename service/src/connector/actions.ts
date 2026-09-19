import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';

/**
 * The Type that carries the `abandoned` flag.
 *
 * A Cart carries exactly ONE custom Type, which makes it a shared resource
 * rather than this connector's private property. So the key is configurable:
 * point it at whatever Type the Project already puts on carts and this
 * connector adds its field to that one instead of competing for the slot.
 *
 * In `specialized-poc` that is `specialized-order`, the single Type every
 * application on the Project shares. Left unset, this connector owns a Type
 * of its own, which is right for a Project where nothing else writes to
 * carts.
 */
export const abandonedCartTypeKey = (): string =>
  process.env.ABANDONED_CART_TYPE_KEY?.trim() || 'abandoned-cart-custom';

/** The one field this connector owns, wherever it ends up living. */
export const ABANDONED_FIELD = 'abandoned';

const fieldDefinition = {
  type: { name: 'Boolean' as const },
  name: ABANDONED_FIELD,
  label: { en: 'Abandoned' },
  required: false,
};

/**
 * Make sure the Type exists and carries `abandoned` — without taking it over.
 *
 * Three cases, and the middle one is the whole point of this function:
 *
 *   - no Type with that key: create it, with just this field;
 *   - a Type exists WITHOUT the field: add the field to it, leaving every
 *     other field and its owner untouched;
 *   - a Type exists WITH the field: nothing to do.
 *
 * Deliberately never delete-and-recreate. Deleting a Type detaches it from
 * every Cart carrying it, which would un-mark every cart this connector has
 * recorded — and mail all of those shoppers again — while also discarding
 * whatever fields another application had put there.
 */
export async function ensureAbandonedCartType(
  apiRoot: ByProjectKeyRequestBuilder
): Promise<void> {
  const key = abandonedCartTypeKey();

  const {
    body: { results: types },
  } = await apiRoot
    .types()
    .get({ queryArgs: { where: `key = "${key}"` } })
    .execute();

  const existing = types[0];

  if (!existing) {
    await apiRoot
      .types()
      .post({
        body: {
          key,
          name: { en: 'Abandoned cart' },
          description: {
            en: 'Carries the abandoned flag that the abandoned-cart connector sets.',
          },
          // There is no `cart` resource type for a custom Type. Carts and
          // Orders share one, spelled `order`, and the API rejects `cart`
          // outright while listing `order` among the valid values.
          resourceTypeIds: ['order'],
          fieldDefinitions: [fieldDefinition],
        },
      })
      .execute();
    return;
  }

  if (existing.fieldDefinitions.some((f) => f.name === ABANDONED_FIELD)) {
    return;
  }

  await apiRoot
    .types()
    .withKey({ key })
    .post({
      body: {
        version: existing.version,
        actions: [{ action: 'addFieldDefinition', fieldDefinition }],
      },
    })
    .execute();
}

/**
 * Left in place on undeploy.
 *
 * Carts still reference it, a Type cannot be deleted while anything carries
 * it, and when the key points at a shared Type it is not this connector's
 * to remove. Removing the connector should not rewrite the Project.
 */
export async function deleteAbandonedCartType(): Promise<void> {
  return;
}
