import { expect, describe, it } from '@jest/globals';

import { isAbandonedCartMessage } from '../../src/validators/message.validators.js';

const message = (overrides = {}) => ({
  notificationType: 'ResourceCreated',
  resource: { typeId: 'key-value-document' },
  resourceUserProvidedIdentifiers: {
    containerAndKey: { container: 'abandoned-carts', key: 'cart-1' },
  },
  ...overrides,
});

describe('isAbandonedCartMessage', () => {
  it('recognises a newly recorded abandoned cart', () => {
    expect(isAbandonedCartMessage(message())).toBe(true);
  });

  // The Subscription cannot be filtered by container, so every Custom Object
  // write in the Project arrives here. A Project with an agent layer or an
  // event log writes thousands of them, and every one of those must fall
  // through without a lookup.
  it('ignores a write to any other container', () => {
    const other = message({
      resourceUserProvidedIdentifiers: {
        containerAndKey: { container: 'decision-log', key: 'entry-1' },
      },
    });
    expect(isAbandonedCartMessage(other)).toBe(false);
  });

  // The handler writes back to the same Custom Object to record the send.
  // Treating that update as a new cart would mail the shopper forever.
  it('ignores an update to a cart it has already handled', () => {
    expect(isAbandonedCartMessage(message({ notificationType: 'ResourceUpdated' }))).toBe(
      false
    );
  });

  it('ignores a message with no container identifiers', () => {
    expect(
      isAbandonedCartMessage(message({ resourceUserProvidedIdentifiers: undefined }))
    ).toBe(false);
  });
});
