import { markAction, processAbandonedCarts } from '../services/abandoned-cart.service';
import { createApiRoot } from '../client/create.client';

jest.mock('../client/create.client');

jest.mock('../utils/config.utils', () => ({
  readConfiguration: () => ({
    clientId: 'mock-client-id-24-chars',
    clientSecret: 'mock-client-secret-32-chars-long',
    projectKey: 'mock-project-key',
    scope: 'mock-scope',
    region: 'us-central1',
  }),
}));

const HOURS_AGO = (n: number) => new Date(Date.now() - n * 3600 * 1000).toISOString();

interface FakeCart {
  id: string;
  version?: number;
  customerEmail?: string;
  customerId?: string;
  lineItems?: unknown[];
  totalPrice?: { centAmount: number; currencyCode: string };
  lastModifiedAt?: string;
}

interface FakeWorld {
  carts: FakeCart[];
  customers?: Record<string, { email?: string }>;
  /** Keys already present in the `abandoned-carts` container. */
  recorded?: string[];
  configuration?: Record<string, unknown> | null;
}

interface Written {
  container: string;
  key: string;
  value: Record<string, unknown>;
}

const notFound = () => {
  const error = new Error('Not found') as Error & { statusCode: number };
  error.statusCode = 404;
  return error;
};

/**
 * A commercetools stand-in that answers from a fixed world.
 *
 * Deliberately not a bag of `jest.fn()`s that resolve whatever the test
 * wants: the earlier version of this suite mocked the cart query to return
 * a cart unconditionally and then asserted that a "too recent" cart was
 * skipped, which passed for an unrelated reason. Here the query predicate
 * and the recorded keys are real, so a test can only pass by the code
 * actually behaving.
 */
function fakeApiRoot(world: FakeWorld) {
  const written: Written[] = [];
  const marked: string[] = [];
  let lastWhere = '';

  const root = {
    carts: () => ({
      get: ({ queryArgs }: { queryArgs: { where: string; offset: number } }) => {
        lastWhere = queryArgs.where;
        const page = queryArgs.offset === 0 ? world.carts : [];
        return { execute: async () => ({ body: { results: page, total: world.carts.length } }) };
      },
      withId: ({ ID }: { ID: string }) => ({
        post: () => ({
          execute: async () => {
            marked.push(ID);
            return { body: {} };
          },
        }),
      }),
    }),
    customers: () => ({
      withId: ({ ID }: { ID: string }) => ({
        get: () => ({
          execute: async () => {
            const customer = world.customers?.[ID];
            if (!customer) throw notFound();
            return { body: customer };
          },
        }),
      }),
    }),
    customObjects: () => ({
      post: ({ body }: { body: Written }) => ({
        execute: async () => {
          written.push(body);
          world.recorded = [...(world.recorded ?? []), body.key];
          return { body: { ...body, version: 1 } };
        },
      }),
      withContainerAndKey: ({ container, key }: { container: string; key: string }) => ({
        get: () => ({
          execute: async () => {
            if (container === 'abandoned-cart' && key === 'configuration') {
              if (!world.configuration) throw notFound();
              return { body: { value: world.configuration } };
            }
            if (container === 'abandoned-carts') {
              if (!world.recorded?.includes(key)) throw notFound();
              return { body: { container, key, version: 1, value: {} } };
            }
            throw notFound();
          },
        }),
      }),
    }),
  };

  return {
    root,
    written: () => written.filter((w) => w.container === 'abandoned-carts'),
    log: () => written.find((w) => w.key === 'service-log'),
    marked: () => marked,
    where: () => lastWhere,
  };
}

const configuration = { abandonAfterHours: '24', ignoreCartsOlderThan: '30' };

describe('processAbandonedCarts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ABANDONED_CART_MAX_PER_RUN;
  });

  it('records a cart and marks it abandoned', async () => {
    const fake = fakeApiRoot({
      configuration,
      carts: [
        {
          id: 'cart-1',
          version: 3,
          customerEmail: 'jen@example.com',
          lineItems: [{}],
          totalPrice: { centAmount: 10000, currencyCode: 'USD' },
          lastModifiedAt: HOURS_AGO(25),
        },
      ],
    });
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    const result = await processAbandonedCarts();

    expect(result.success).toBe(true);
    expect(result.totalCreated).toBe(1);
    expect(fake.written()).toHaveLength(1);
    expect(fake.written()[0].value).toMatchObject({
      customerEmail: 'jen@example.com',
      cartTotal: '100.00',
      cartId: 'cart-1',
    });
    expect(fake.marked()).toEqual(['cart-1']);
  });

  // The bug that made this connector do nothing in a real Project: a
  // storefront that signs a customer in without calling setCustomerEmail
  // leaves every cart's customerEmail empty, and reading only that field
  // finds nothing to do and reports a clean run.
  it('falls back to the customer record when the cart carries no email', async () => {
    const fake = fakeApiRoot({
      configuration,
      customers: { 'customer-9': { email: 'from-customer@example.com' } },
      carts: [
        {
          id: 'cart-1',
          version: 1,
          customerId: 'customer-9',
          lineItems: [{}],
          totalPrice: { centAmount: 2500, currencyCode: 'USD' },
          lastModifiedAt: HOURS_AGO(25),
        },
      ],
    });
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    const result = await processAbandonedCarts();

    expect(result.totalCreated).toBe(1);
    expect(fake.written()[0].value).toMatchObject({
      customerEmail: 'from-customer@example.com',
    });
  });

  it('skips a cart with no reachable address', async () => {
    const fake = fakeApiRoot({
      configuration,
      carts: [{ id: 'cart-1', version: 1, lineItems: [{}], lastModifiedAt: HOURS_AGO(25) }],
    });
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    const result = await processAbandonedCarts();

    expect(result.totalCreated).toBe(0);
    expect(result.skippedNoEmail).toBe(1);
  });

  it('skips an empty cart', async () => {
    const fake = fakeApiRoot({
      configuration,
      carts: [
        {
          id: 'cart-1',
          version: 1,
          customerEmail: 'jen@example.com',
          lineItems: [],
          lastModifiedAt: HOURS_AGO(25),
        },
      ],
    });
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    const result = await processAbandonedCarts();

    expect(result.totalCreated).toBe(0);
    expect(result.skippedEmpty).toBe(1);
  });

  // A second run must not mail the same shopper again.
  it('leaves an already recorded cart alone', async () => {
    const fake = fakeApiRoot({
      configuration,
      recorded: ['cart-1'],
      carts: [
        {
          id: 'cart-1',
          version: 1,
          customerEmail: 'jen@example.com',
          lineItems: [{}],
          lastModifiedAt: HOURS_AGO(25),
        },
      ],
    });
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    const result = await processAbandonedCarts();

    expect(result.totalCreated).toBe(0);
    expect(fake.written()).toHaveLength(0);
  });

  // Installing the connector into a Project with a backlog must not mail
  // everyone at once, and what it held back has to be visible.
  it('stops at the per-run cap and reports the backlog', async () => {
    process.env.ABANDONED_CART_MAX_PER_RUN = '2';
    const fake = fakeApiRoot({
      configuration,
      carts: Array.from({ length: 5 }, (_, i) => ({
        id: `cart-${i}`,
        version: 1,
        customerEmail: `shopper-${i}@example.com`,
        lineItems: [{}],
        totalPrice: { centAmount: 1000, currencyCode: 'USD' },
        lastModifiedAt: HOURS_AGO(25),
      })),
    });
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    const result = await processAbandonedCarts();

    expect(result.totalCreated).toBe(2);
    expect(result.skippedByCap).toBe(3);
    expect(result.message).toContain('held back by the per-run cap');
    expect(fake.log()?.value).toMatchObject({ skippedByCap: 3, maxPerRun: 2 });
  });

  it('only looks at active carts inside the configured window', async () => {
    const fake = fakeApiRoot({ configuration, carts: [] });
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    await processAbandonedCarts();

    expect(fake.where()).toContain('cartState = "Active"');
    expect(fake.where()).toContain('custom(fields(abandoned != true))');
    expect(fake.where()).toMatch(/lastModifiedAt < "/);
    expect(fake.where()).toMatch(/lastModifiedAt > "/);
  });

  it('reports a missing configuration rather than guessing', async () => {
    const fake = fakeApiRoot({ configuration: null, carts: [] });
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    const result = await processAbandonedCarts();

    expect(result.success).toBe(false);
    expect(result.error).toContain('No configuration found');
  });
});

// A Cart carries exactly one custom Type, so marking replaces whatever it
// already had. In a Project where an API Extension or another connector
// already puts one on carts, that is somebody else's data.
describe('ABANDONED_CART_MARK_CARTS', () => {
  afterEach(() => {
    delete process.env.ABANDONED_CART_MARK_CARTS;
  });

  const oneCart = () => ({
    configuration: { abandonAfterHours: '24', ignoreCartsOlderThan: '30' },
    carts: [
      {
        id: 'cart-1',
        version: 1,
        customerEmail: 'jen@example.com',
        lineItems: [{}],
        totalPrice: { centAmount: 1000, currencyCode: 'USD' },
        lastModifiedAt: HOURS_AGO(25),
      },
    ],
  });

  it('leaves the cart untouched when marking is off', async () => {
    process.env.ABANDONED_CART_MARK_CARTS = 'false';
    const fake = fakeApiRoot(oneCart());
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    const result = await processAbandonedCarts();

    expect(result.totalCreated).toBe(1);
    expect(fake.written()).toHaveLength(1);
    expect(fake.marked()).toEqual([]);
  });

  it('marks by default', async () => {
    const fake = fakeApiRoot(oneCart());
    (createApiRoot as jest.Mock).mockReturnValue(fake.root);

    await processAbandonedCarts();

    expect(fake.marked()).toEqual(['cart-1']);
  });
});


// A Cart carries exactly one custom Type and `setCustomType` REPLACES
// rather than merges: every field the incoming Type does not define is
// dropped, silently, and the owner of that data has no way to know.
describe('markAction', () => {
  const cart = (custom?: { type: { id: string } }) =>
    ({ id: 'cart-1', version: 1, lineItems: [], custom }) as never;

  afterEach(() => {
    delete process.env.ABANDONED_CART_TYPE_KEY;
  });

  it('sets the Type and the field on a cart that has neither', () => {
    expect(markAction(cart(), 'type-1')).toEqual({
      action: 'setCustomType',
      type: { typeId: 'type', key: 'abandoned-cart-custom' },
      fields: { abandoned: true },
    });
  });

  it('sets only the field when the cart already carries our Type', () => {
    expect(markAction(cart({ type: { id: 'type-1' } }), 'type-1')).toEqual({
      action: 'setCustomField',
      name: 'abandoned',
      value: true,
    });
  });

  // The one that matters. specialized-poc has an API Extension that puts
  // its own Type on carts, and replacing it dropped that Extension's field.
  it('declines to touch a cart carrying another application Type', () => {
    expect(markAction(cart({ type: { id: 'someone-elses' } }), 'type-1')).toBeNull();
  });

  it('honours a configured Type key when it has to create one', () => {
    process.env.ABANDONED_CART_TYPE_KEY = 'specialized-order';
    expect(markAction(cart(), null)).toMatchObject({
      type: { typeId: 'type', key: 'specialized-order' },
    });
  });
});
