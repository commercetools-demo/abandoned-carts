import { Cart } from '@commercetools/platform-sdk';
import { createApiRoot } from '../client/create.client';
import { logger } from '../utils/logger.utils';
import CustomError from '../errors/custom.error';
import { ABANDONED_CART_TYPE_KEY } from '../connector/actions';

const ABANDONED_CARTS_CONTAINER = 'abandoned-carts';
const CONFIG_CONTAINER = 'abandoned-cart';
const PAGE_SIZE = 100;
const DEFAULT_MAX_PER_RUN = 10;

interface RunSummary {
  success: boolean;
  totalFetched: number;
  totalProcessed: number;
  totalCreated: number;
  skippedNoEmail: number;
  skippedEmpty: number;
  skippedByCap: number;
  configuration?: { abandonAfterHours: number; ignoreCartsOlderThanDays: number };
  error?: string;
  message: string;
}

/**
 * How many carts one run may record.
 *
 * A Project that has been running for a while has a backlog of stale carts,
 * and without a cap the first run records every one of them — which means
 * every one of those shoppers is emailed, at once, because of an install.
 * The cap makes the first run a sample rather than a broadcast, and what it
 * left behind is written to the service log rather than passed over in
 * silence.
 */
function maxPerRun(): number {
  const raw = process.env.ABANDONED_CART_MAX_PER_RUN;
  if (!raw) return DEFAULT_MAX_PER_RUN;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PER_RUN;
}

/**
 * Whether to write the `abandoned` flag onto the cart.
 *
 * A Cart carries exactly one custom Type, so marking it replaces whatever
 * Type it already had. In a Project where something else already puts a
 * Type on carts — an API Extension, another connector — that is somebody
 * else's data being overwritten, and it is worth being able to decline.
 *
 * Declining costs only the Cart Discount: `alreadyRecorded` is what keeps
 * a cart from being recorded and emailed twice, not the flag.
 */
function shouldMarkCarts(): boolean {
  return process.env.ABANDONED_CART_MARK_CARTS !== 'false';
}

/**
 * The address to write to.
 *
 * `customerEmail` is set by whatever created the cart, and a storefront that
 * signs a customer in and never calls `setCustomerEmail` leaves it empty on
 * every cart it makes — so reading only that field finds nothing to do and
 * reports a clean run. The customer record is the fallback, and it is the
 * authoritative address anyway.
 */
async function resolveEmail(cart: Cart): Promise<string | null> {
  if (cart.customerEmail) return cart.customerEmail;
  if (!cart.customerId) return null;

  try {
    const { body: customer } = await createApiRoot()
      .customers()
      .withId({ ID: cart.customerId })
      .get()
      .execute();
    return customer.email ?? null;
  } catch (error) {
    logger.warn(
      `Could not read customer ${cart.customerId} for cart ${cart.id}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    return null;
  }
}

/** Has this cart already been recorded? Guards against a re-send. */
async function alreadyRecorded(cartId: string): Promise<boolean> {
  try {
    await createApiRoot()
      .customObjects()
      .withContainerAndKey({ container: ABANDONED_CARTS_CONTAINER, key: cartId })
      .get()
      .execute();
    return true;
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) return false;
    throw error;
  }
}

/**
 * Record one cart, and mark it if marking is enabled.
 *
 * The Custom Object is written first. The mail-sender reacts to that write,
 * so it is the point of no return: if marking the cart fails afterwards the
 * shopper has still been emailed exactly once, and `alreadyRecorded` keeps
 * the next run from doing it again.
 */
async function recordCart(cart: Cart, email: string): Promise<void> {
  const cartTotal = cart.totalPrice?.centAmount
    ? (cart.totalPrice.centAmount / 100).toFixed(2)
    : '0.00';

  await createApiRoot()
    .customObjects()
    .post({
      body: {
        container: ABANDONED_CARTS_CONTAINER,
        key: cart.id,
        value: {
          customerEmail: email,
          cartTotal,
          cartId: cart.id,
          abandonmentDate: cart.lastModifiedAt,
          currencyCode: cart.totalPrice?.currencyCode || 'USD',
          lineItemCount: cart.lineItems.length,
        },
      },
    })
    .execute();

  if (!shouldMarkCarts()) return;

  try {
    await createApiRoot()
      .carts()
      .withId({ ID: cart.id })
      .post({
        body: {
          version: cart.version,
          actions: [
            {
              action: 'setCustomType',
              type: { typeId: 'type', key: ABANDONED_CART_TYPE_KEY },
              fields: { abandoned: true },
            },
          ],
        },
      })
      .execute();
  } catch (error) {
    logger.error(
      `Recorded cart ${cart.id} but could not set its abandoned flag: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
  }
}

async function writeServiceLog(value: Record<string, unknown>): Promise<void> {
  try {
    await createApiRoot()
      .customObjects()
      .post({
        body: { container: CONFIG_CONTAINER, key: 'service-log', value },
      })
      .execute();
  } catch (error) {
    logger.error(
      `Failed to write the service log: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
  }
}

/**
 * Find the carts that have gone quiet and record one Custom Object each.
 *
 * Two boundaries, both from the configuration a merchandiser sets in the
 * Merchant Center: a cart is abandoned once it has been untouched for
 * `abandonAfterHours`, and it is too old to be worth chasing after
 * `ignoreCartsOlderThan` days.
 */
export const processAbandonedCarts = async (): Promise<RunSummary> => {
  const startTime = new Date();
  let totalFetched = 0;
  let totalProcessed = 0;
  let totalCreated = 0;
  let skippedNoEmail = 0;
  let skippedEmpty = 0;
  let skippedByCap = 0;

  try {
    const configuration = await fetchConfiguration();

    const abandonAfterHours = parseFloat(configuration.abandonAfterHours);
    const ignoreCartsOlderThanDays = parseFloat(configuration.ignoreCartsOlderThan);

    if (!Number.isFinite(abandonAfterHours) || !Number.isFinite(ignoreCartsOlderThanDays)) {
      throw new CustomError(
        400,
        'Configuration is incomplete: abandonAfterHours and ignoreCartsOlderThan must both be numbers.'
      );
    }
    if (abandonAfterHours < 0 || ignoreCartsOlderThanDays < 0) {
      throw new CustomError(400, 'Configuration values must be non-negative.');
    }

    const cap = maxPerRun();
    logger.info(
      `Abandoned after ${abandonAfterHours}h, ignored after ${ignoreCartsOlderThanDays}d, ` +
        `at most ${cap} per run, marking carts ${shouldMarkCarts() ? 'on' : 'off'}.`
    );

    const now = Date.now();
    const quietSince = new Date(now - abandonAfterHours * 3600 * 1000).toISOString();
    const tooOldBefore = new Date(now - ignoreCartsOlderThanDays * 86400 * 1000).toISOString();

    // `custom(fields(abandoned != true))` also matches carts with no custom
    // type at all, which is every cart the first time it is seen.
    const where = [
      'cartState = "Active"',
      `lastModifiedAt < "${quietSince}"`,
      `lastModifiedAt > "${tooOldBefore}"`,
      'custom(fields(abandoned != true))',
    ].join(' and ');

    let offset = 0;
    let candidates = 0;
    let capReached = false;

    for (;;) {
      const { body } = await createApiRoot()
        .carts()
        .get({ queryArgs: { limit: PAGE_SIZE, offset, where, sort: 'lastModifiedAt asc' } })
        .execute();

      const carts = body.results ?? [];
      if (offset === 0) candidates = body.total ?? carts.length;
      if (carts.length === 0) break;
      totalFetched += carts.length;

      // Recording a cart sets its `abandoned` flag, which drops it out of the
      // predicate — so the next page starts after the ones that stayed, not
      // after every cart seen. Counting the leftovers is what keeps paging
      // from stepping over the carts that slid into their place.
      let leftInPlace = 0;

      for (const cart of carts) {
        totalProcessed++;

        if (totalCreated >= cap) {
          capReached = true;
          break;
        }

        try {
          // An empty cart is not an abandoned purchase, it is a visit.
          if (cart.lineItems.length === 0) {
            skippedEmpty++;
            leftInPlace++;
            continue;
          }

          const email = await resolveEmail(cart);
          if (!email) {
            skippedNoEmail++;
            leftInPlace++;
            continue;
          }

          if (await alreadyRecorded(cart.id)) {
            leftInPlace++;
            continue;
          }

          await recordCart(cart, email);
          totalCreated++;
          logger.info(`Recorded abandoned cart ${cart.id} for ${email}`);
        } catch (error) {
          leftInPlace++;
          logger.error(
            `Error processing cart ${cart.id}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`
          );
        }
      }

      if (capReached || carts.length < PAGE_SIZE) break;
      offset += leftInPlace;
    }

    // Everything that matched the predicate and was neither recorded nor
    // ruled out is still waiting. Reporting it from the query's own total
    // rather than from what the loop happened to reach means the number is
    // the real backlog, not the part of it one page saw.
    if (capReached) {
      skippedByCap = Math.max(0, candidates - totalCreated - skippedEmpty - skippedNoEmail);
    }

    if (skippedByCap > 0) {
      logger.warn(
        `${skippedByCap} more cart(s) qualified but were left for the next run by ABANDONED_CART_MAX_PER_RUN=${cap}.`
      );
    }

    const endTime = new Date();
    await writeServiceLog({
      lastRunTime: endTime.toISOString(),
      cartsFetched: totalFetched,
      abandonedCartObjectsCreated: totalCreated,
      skippedNoEmail,
      skippedEmpty,
      skippedByCap,
      maxPerRun: cap,
      markCarts: shouldMarkCarts(),
      processingDuration: endTime.getTime() - startTime.getTime(),
      configuration: { abandonAfterHours, ignoreCartsOlderThanDays },
      status: 'ok',
    });

    const skipNote = [
      skippedEmpty ? `${skippedEmpty} empty` : null,
      skippedNoEmail ? `${skippedNoEmail} with no reachable email` : null,
      skippedByCap ? `${skippedByCap} held back by the per-run cap of ${cap}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      success: true,
      totalFetched,
      totalProcessed,
      totalCreated,
      skippedNoEmail,
      skippedEmpty,
      skippedByCap,
      configuration: { abandonAfterHours, ignoreCartsOlderThanDays },
      message:
        `Recorded ${totalCreated} abandoned cart(s) from ${totalFetched} candidate(s).` +
        (skipNote ? ` Skipped: ${skipNote}.` : ''),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Abandoned cart processing failed: ${errorMessage}`);

    const endTime = new Date();
    await writeServiceLog({
      lastRunTime: endTime.toISOString(),
      cartsFetched: totalFetched,
      abandonedCartObjectsCreated: totalCreated,
      processingDuration: endTime.getTime() - startTime.getTime(),
      error: errorMessage,
      status: 'error',
    });

    return {
      success: false,
      totalFetched,
      totalProcessed,
      totalCreated,
      skippedNoEmail,
      skippedEmpty,
      skippedByCap,
      error: errorMessage,
      message: `Failed to process abandoned carts: ${errorMessage}`,
    };
  }
};

/** The rules a merchandiser set in the Merchant Center. */
const fetchConfiguration = async () => {
  try {
    const { body } = await createApiRoot()
      .customObjects()
      .withContainerAndKey({ container: CONFIG_CONTAINER, key: 'configuration' })
      .get()
      .execute();

    if (!body?.value) {
      throw new CustomError(404, 'No configuration found. Set the rules in the Merchant Center first.');
    }

    // The Merchant Center application stores the form as a JSON string.
    const value = body.value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new CustomError(400, 'The stored configuration is not valid JSON.');
      }
    }
    return value;
  } catch (error) {
    if (error instanceof CustomError) throw error;
    if ((error as { statusCode?: number }).statusCode === 404) {
      throw new CustomError(404, 'No configuration found. Set the rules in the Merchant Center first.');
    }
    throw new CustomError(
      500,
      `Could not read the configuration: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
};
