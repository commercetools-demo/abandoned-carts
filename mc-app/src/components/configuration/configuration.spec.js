import { setupServer } from 'msw/node';
import { graphql } from 'msw';
import {
  screen,
  mapResourceAccessToAppliedPermissions,
} from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import { entryPointUriPath, PERMISSIONS } from '../../constants';
import ApplicationRoutes from '../../routes';

/**
 * The screen reads three Custom Objects and the Project's cart discounts.
 * Every one of them is answered here rather than left to reach the network:
 * an unanswered query surfaces as a console error, which this preset treats
 * as a failing test, and the failure names the transport rather than the
 * screen.
 */
const mockServer = setupServer(
  graphql.query('FetchConfiguration', (_req, res, ctx) =>
    res(ctx.data({ customObject: null }))
  ),
  graphql.query('FetchCartDiscounts', (_req, res, ctx) =>
    res(
      ctx.data({
        cartDiscounts: { total: 0, count: 0, offset: 0, results: [] },
      })
    )
  )
);

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

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
// fire.
it('accepts an abandonment window shorter than an hour', async () => {
  renderApp();
  const hours = await screen.findByPlaceholderText('Enter hours');
  expect(hours).toHaveAttribute('step', '0.25');
  expect(hours).toHaveAttribute('min', '0');
});
