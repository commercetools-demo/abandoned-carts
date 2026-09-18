/**
 * No imports, deliberately.
 *
 * This file is evaluated by Node in the deployment container, where an
 * import of a source module is a bet on that runtime's module resolution —
 * a bet that pays locally and fails where it runs, and whose failure is a
 * container that exits before writing anything the deployment log captures.
 * The report then says only "Connector provisioning failed".
 *
 * So the permission keys are computed here rather than derived from appkit.
 * `src/constants.js` keeps its own copy for the browser bundle, where the
 * import is compiled and fine.
 */

// Entry point paths are globally unique across every Merchant Center Custom
// Application, so a registration may have to use something other than the
// obvious name — and the permission keys are derived from whatever it is.
const entryPointUriPath = process.env.ENTRY_POINT_URI_PATH || 'abandoned-carts';

// `specialized-abandoned-carts` → ViewSpecializedAbandonedCarts.
const pascalCase = entryPointUriPath
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join('');

const PERMISSIONS = {
  View: `View${pascalCase}`,
  Manage: `Manage${pascalCase}`,
};

/**
 * @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication}
 */
const config = {
  name: 'Abandoned Carts',
  entryPointUriPath,
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    development: {
      initialProjectKey: '${env:INITIAL_PROJECT_KEY}',
    },
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
  },
  // The application's own data lives in Custom Objects: the rules a
  // merchandiser saves, the recorded carts, and the run log. Without the
  // key-value-document scopes every query the app makes is refused and the
  // screens come up empty with nothing saying why.
  oAuthScopes: {
    view: ['view_orders', 'view_key_value_documents', 'view_cart_discounts'],
    manage: ['manage_orders', 'manage_key_value_documents'],
  },
  icon: '${path:@commercetools-frontend/assets/application-icons/rocket.svg}',
  mainMenuLink: {
    defaultLabel: 'Abandoned Carts',
    labelAllLocales: [],
    permissions: [PERMISSIONS.View],
  },
  submenuLinks: [
    {
      uriPath: 'configuration',
      defaultLabel: 'Configuration',
      labelAllLocales: [],
      permissions: [PERMISSIONS.View],
    },
    {
      uriPath: 'carts',
      defaultLabel: 'Abandoned Carts',
      labelAllLocales: [],
      permissions: [PERMISSIONS.View],
    },
    {
      uriPath: 'service-administration',
      defaultLabel: 'Service Administration',
      labelAllLocales: [],
      permissions: [PERMISSIONS.View],
    },
  ],
};

export default config;
