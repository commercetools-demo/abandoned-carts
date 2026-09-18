// Make sure to import the helper functions from the `ssr` entry point.
import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

/**
 * Read from the environment, never hardcoded.
 *
 * The entry point path is globally unique across every Merchant Center
 * Custom Application, so a plain name like `abandoned-carts` may already be
 * taken and the registration has to use something else. The permission keys
 * are derived from whatever it ends up being — `specialized-abandoned-carts`
 * becomes ViewSpecializedAbandonedCarts — so a constant that disagrees with
 * the registration produces an application that loads and then refuses every
 * user for a permission that does not exist.
 */
export const entryPointUriPath =
  process.env.ENTRY_POINT_URI_PATH || 'abandoned-carts';

export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);
