// Make sure to import the helper functions from the `ssr` entry point.
import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

/**
 * The entry point path, from whichever side of the build is asking.
 *
 * Merchant Center entry point paths are globally unique across every Custom
 * Application, so a registration may have to use something other than the
 * obvious name — and the permission keys are derived from it, so a constant
 * that disagrees with the registration produces an application that loads
 * and then refuses every user for a permission that does not exist.
 *
 * Two callers, two sources, and only one of them is Node:
 *
 *   - `custom-application-config.mjs` runs in Node at build time, where the
 *     deployment's environment is readable.
 *   - The application itself runs in a browser, where it is not:
 *     `mc-scripts` does not inline `process.env.ENTRY_POINT_URI_PATH` into
 *     the bundle. It injects the resolved value into `window.app` instead,
 *     which is the authoritative copy — it is what the Merchant Center
 *     served the application under.
 *
 * Reading only `process.env` compiles to the fallback in the browser, which
 * is the exact failure this is meant to prevent.
 */
function resolveEntryPointUriPath() {
  if (typeof window !== 'undefined' && window.app?.entryPointUriPath) {
    return window.app.entryPointUriPath;
  }
  if (typeof process !== 'undefined' && process.env?.ENTRY_POINT_URI_PATH) {
    return process.env.ENTRY_POINT_URI_PATH;
  }
  return 'abandoned-carts';
}

export const entryPointUriPath = resolveEntryPointUriPath();

export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);
