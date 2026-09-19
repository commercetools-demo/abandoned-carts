import {
  screen,
  within,
  mapResourceAccessToAppliedPermissions,
} from '@commercetools-frontend/application-shell/test-utils';
import { renderApplicationWithRedux } from '../../test-utils';
import { entryPointUriPath, PERMISSIONS } from '../../constants';
import { TEMPLATE_VARIABLES } from '../../email-template';
import ApplicationRoutes from '../../routes';

/**
 * The screen's two data sources are stubbed at the hook rather than at the
 * transport. An unanswered query surfaces as a console error, which this
 * preset treats as a failing test, and the failure then names the transport
 * instead of the screen.
 *
 * `mockConfiguration` is `mock`-prefixed so the hoisted `jest.mock` factory
 * may close over it. A test that needs a stored template sets it before
 * rendering; `beforeEach` puts it back to a Project with no configuration.
 */
let mockConfiguration = null;

jest.mock('../../hooks/use-configuration-connector', () => ({
  useConfigurationFetcher: () => ({
    configuration: mockConfiguration,
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

beforeEach(() => {
  mockConfiguration = null;
});

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

// The editor shows placeholders as chips rather than as `{{firstName}}`.
// Seeing the raw braces is what invites someone to hand-type them, and a
// hand-typed one is a backspace away from being mailed literally.
it('shows the template placeholders as chips, in the subject and the body', async () => {
  renderApp();
  // The default subject and body both use firstName, so it appears twice.
  const chips = await screen.findAllByText('firstName');
  expect(chips.length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText(/\{\{firstName\}\}/)).not.toBeInTheDocument();
});

it('offers every contract variable from the toolbar', async () => {
  renderApp();
  const pickers = await screen.findAllByLabelText('Insert variable');
  // One over the subject, one over the body.
  expect(pickers).toHaveLength(2);
  for (const variable of TEMPLATE_VARIABLES) {
    expect(within(pickers[1]).getByText(variable.name)).toBeInTheDocument();
  }
});

// A Project with no configuration starts on the shipped template rather
// than on nothing: an empty subject and body are both save errors, so an
// empty start would present a form that cannot be submitted.
it('starts a fresh project on a template it can save', async () => {
  renderApp();
  const save = await screen.findByRole('button', {
    name: 'Save Configuration',
  });
  expect(save).toBeEnabled();
});

// The editor cannot produce a broken placeholder, but a Project that
// predates it can, and this screen is the last place anyone looks before a
// shopper does.
it('refuses to save a template carrying a placeholder it cannot fill', async () => {
  mockConfiguration = {
    value: {
      emailSubject: 'Your cart',
      emailTemplate: '<p>Hi {{prodcutName}}</p>',
    },
  };
  renderApp();
  await screen.findByText(/\{\{prodcutName\}\} is not a placeholder/);
  expect(
    screen.getByRole('button', { name: 'Save Configuration' })
  ).toBeDisabled();
});

it('previews the email with example values, not with raw tokens', async () => {
  renderApp();
  const preview = await screen.findByTitle('Preview');
  // srcDoc is what the iframe renders; jsdom does not execute it.
  expect(preview).toHaveAttribute('srcdoc', expect.stringContaining('129.00'));
  expect(preview.getAttribute('srcdoc')).not.toMatch(/\{\{/);
});
