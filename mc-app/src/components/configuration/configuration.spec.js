import {
  screen,
  mapResourceAccessToAppliedPermissions,
} from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import { entryPointUriPath, PERMISSIONS } from '../../constants';
import ApplicationRoutes from '../../routes';

/**
 * The screen's two data sources are stubbed at the hook rather than at the
 * transport. An unanswered query surfaces as a console error, which this
 * preset treats as a failing test, and the failure then names the transport
 * instead of the screen.
 */
jest.mock('../../hooks/use-configuration-connector', () => ({
  useConfigurationFetcher: () => ({
    configuration: null,
    error: undefined,
    loading: false,
    refetch: jest.fn(),
  }),
  useConfigurationUpdater: () => ({ loading: false, execute: jest.fn() }),
}));

jest.mock('../../hooks/use-discounts-connector', () => ({
  useDiscountsFetcher: () => ({
    discountsPaginatedResult: { results: [] },
    error: undefined,
    loading: false,
  }),
}));

const renderApp = (options = {}) =>
  renderApplicationWithRedux(<ApplicationRoutes />, {
    route: options.route || `/my-project/${entryPointUriPath}`,
    project: {
      allAppliedPermissions: mapResourceAccessToAppliedPermissions([
        PERMISSIONS.View,
      ]),
    },
    ...options,
  });

it('opens on the configuration screen', async () => {
  renderApp();
  await screen.findByText('Abandoned Carts Configuration');
});

it('offers the two abandonment boundaries', async () => {
  renderApp();
  await screen.findByText('Mark carts abandoned after');
  await screen.findByText('Ignore carts older than');
});

// The window is settable in fractions of an hour. A whole-hour minimum makes
// the behaviour impossible to show: nobody waits an hour to watch a schedule
// fire. TextInput never forwarded these to the DOM, which is why the field
// is a NumberInput.
it('accepts an abandonment window shorter than an hour', async () => {
  renderApp();
  const hours = await screen.findByPlaceholderText('Enter hours');
  expect(hours).toHaveAttribute('step', '0.25');
  expect(hours).toHaveAttribute('min', '0');
});

// Nothing in the project has an abandoned-cart discount until someone
// creates one, and the empty state has to say what to create.
it('explains what to create when no abandoned-cart discount exists', async () => {
  renderApp();
  await screen.findByText(/custom.abandoned = true/);
});
