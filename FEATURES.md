# Features

Code-derived inventory of what this repo implements. Bullets and key file paths —
the mechanism lives in `docs/how-it-works.md`, the walkthrough in `docs/demo-script.md`.

_Last generated: 2026-09-02 by feature-doc._

Built from scratch as a commercetools Connect connector (`connect.yaml`) — not a fork
of any of the storefront starters. It is a five-module abandoned-cart funnel: a
Merchant Center Custom Application (`mc-app`), an HTTP processing `service`, a cron
`job` that triggers it, and two event handlers (`mail-sender`, `order-created-event`)
that react to Google Cloud Pub/Sub push messages. commercetools Custom Objects are the
only system of record — there is no separate database. The `mc-app` dev config points
at CT project `medtronic-poc` (`mc-app/custom-application-config.mjs`).

## Cart Abandonment Detection (`job` + `service`)

- Scheduled job posts to the abandoned-cart service every 5 minutes (`connect.yaml`
  `job.properties.schedule: */5 * * * *`, `job/src/controllers/job.controller.ts`).
- Service batches through every `Active` cart whose `lastModifiedAt` falls inside a
  configurable abandonment window (older than `abandonAfterHours`, newer than
  `ignoreCartsOlderThan` days) and that isn't already flagged, via a single CT query
  predicate (`service/src/services/abandoned-cart.service.ts`).
- For each newly-abandoned cart with a customer email: creates an
  `abandoned-carts/{cartId}` custom object snapshotting email, total, currency and
  abandonment date, then sets a custom field `abandoned: true` on the cart itself
  (custom type `abandoned-cart-custom`) so it is excluded from the next run.
- Every run — success or failure — writes an `abandoned-cart/service-log` custom
  object with counts processed/fetched/created, duration, and the configuration used;
  a failed run is logged with `status: "error"` and the error message rather than
  silently dropped.
- Per-cart failures are caught and skipped so one bad cart doesn't abort the batch;
  the cart-update-flag step is likewise best-effort and doesn't fail the run.
- Configuration (thresholds, discount, email subject/template) is read from a single
  `abandoned-cart/configuration` custom object rather than env vars, so the abandonment
  window and copy can be changed live from the Merchant Center app.
- "Run Now" in the mc-app hits this exact HTTP endpoint on demand, so the funnel can be
  demoed without waiting on the cron.

## Email Notifications (`mail-sender`)

- Subscribes directly to Google Cloud Pub/Sub (or Azure Service Bus) for
  `key-value-document` (custom object) create events — no commercetools Subscription
  filter on container, so every custom object create arrives and is filtered in-app.
- A handler factory + message validators route only abandoned-cart-shaped payloads to
  `AbandonedCartHandler`; anything else is logged and ignored
  (`mail-sender/src/factory/handler.factory.js`, `validators/message.validators.js`).
- On an abandoned-cart message: re-fetches the cart and customer from commercetools,
  loads the MC-authored subject/template from `abandoned-cart/configuration`, and
  substitutes `[firstName]` in the template with the customer's first name
  (`mail-sender/src/handlers/abandoned-cart.handler.js`).
- Sends via SendGrid; if no rich-text template is configured it falls back to a
  generated plain HTML/text summary (cart total, ID, abandonment date, item count)
  (`mail-sender/src/handlers/generic.handler.js`).
- Stamps the `abandoned-carts/{cartId}` object with `emailSentDate` after a successful
  send, which is what drives the "Email Sent" column in the mc-app carts table.
- The only one of the five modules whose Connect deploy scripts are actually wired up:
  `connect.yaml` runs its `postDeploy`/`preUndeploy` to create/tear down the Pub/Sub
  subscription automatically (`mail-sender/src/connector/{post-deploy,pre-undeploy}.js`).

## Order Conversion Tracking (`order-created-event`)

- Receives `OrderCreated` Pub/Sub push messages, resolves the originating cart ID from
  the order payload, and stamps the matching `abandoned-carts/{cartId}` custom object
  with `cartConvertedDate` (`order-created-event/src/controllers/event.controller.ts`)
  — the "Cart Converted" column in the mc-app carts table.
- Tolerant of noise: a malformed body, a non-`OrderCreated` notification, an order with
  no cart, or a 404 (cart was never marked abandoned) all resolve to a `204` no-op
  instead of an error.
- Stubbed / inconsistent with its own job: this module's `connector/actions.ts` and
  `post-deploy.ts` provision a `CustomerCreated` Pub/Sub subscription, not an
  `OrderCreated` one — unmodified connect-application-kit scaffold left over from
  the template, unrelated to the `OrderCreated` handling the controller actually does.
  Neither this module's nor `service`'s connector scripts are referenced in
  `connect.yaml` (only `mail-sender`'s are), so neither runs on a real Connect deploy;
  the real `OrderCreated` subscription has to be created by hand, and `test/` ships
  polling/replay scripts to exercise the handler locally instead
  (`test/order-created-polling.ts`, `test/resend-order-created-event.ts`).

## Merchant Center Administration (`mc-app`)

- Three-tab Custom Application — Configuration, Abandoned Carts, Service
  Administration — registered via `mc-app/custom-application-config.mjs` and
  `src/routes.jsx`.
- **Configuration tab**: sets the abandon-after-hours / ignore-carts-older-than-days
  thresholds, an email subject, and a WYSIWYG rich-text email body
  (`@commercetools-uikit/rich-text-input`); also queries live CT cart discounts and
  offers only the ones whose predicate contains `custom.abandoned = true` as a discount
  to associate with the funnel (`mc-app/src/components/configuration/configuration.jsx`).
  Saves to the `abandoned-cart/configuration` custom object.
- **Abandoned Carts tab**: sortable table over every `abandoned-carts/*` custom object
  (email, total, abandonment date, email-sent date, cart-converted date), with a row
  click that opens a raw-JSON detail modal for the underlying custom object
  (`mc-app/src/components/carts/carts.jsx`).
- **Service Administration tab**: shows the last run's stats from the
  `abandoned-cart/service-log` object (carts fetched/created, duration, last error) and
  a "Run Now" button that first health-checks the service, then triggers the same
  processing endpoint the scheduled job calls
  (`mc-app/src/components/service-administration/service-administration.jsx`).
- Stubbed: the discount picked in the Configuration tab is persisted to the config
  custom object, but nothing in `service` or `mail-sender` reads it back or applies a
  discount to a cart — there is no code path that acts on the selection. The
  Configuration tab's "Cancel" button is also a no-op (`console.log` only).

## commercetools Integrations & Data Model

- Custom Objects as the entire system of record — no external database anywhere in the
  stack:
  - `abandoned-cart` / `configuration` — funnel thresholds, discount choice, email copy
  - `abandoned-cart` / `service-log` — last-run statistics and error state
  - `abandoned-carts` / `{cartId}` — one record per abandoned cart, its lifecycle
    (abandoned → emailed → converted) tracked entirely via fields added over time
- Custom Type `abandoned-cart-custom` adds the `abandoned` boolean field to `cart`,
  which both drives the detection query and prevents re-processing.
- Two direct Google Cloud Pub/Sub push subscriptions carry the event-driven half of the
  flow (custom-object-create → `mail-sender`, `OrderCreated` → `order-created-event`) —
  there is no commercetools Subscription-side type filter, and no CT API Extension in
  the live path.
- `service/src/connector/actions.ts` defines an unused CT API Extension
  (`myconnector-cartUpdateExtension`, triggered on cart `Update`) and an unused
  `cart-discount` custom type (`myconnector-cartDiscountType`) — connect-application-kit
  boilerplate never renamed or wired to real behavior; its `cartController` handles
  `Create` with a no-op `recalculate` action and `Update` with an empty `break`.

## Demo Tooling & Test Scripts (`test/`)

- `abandoned-cart-polling.ts` / `order-created-polling.ts` poll the raw GCP Pub/Sub
  topics directly and forward messages to the locally-running `mail-sender` /
  `order-created-event` services, for local development without a deployed
  subscription.
- `check-abandoned-status.ts` / `unset-abandoned-carts.ts` audit and reset the
  `abandoned` custom field across every cart, so a demo can be re-run from a clean
  state.
- `create-order-from-cart.ts` is an interactive CLI that lists active carts and walks
  through converting one to an order, to drive the conversion-tracking path live.
- `resend-order-created-event.ts` replays a captured `OrderCreated` payload
  (`order-created-messages.json`) against a locally running `order-created-event`
  handler.
- `list-custom-objects.ts`, `delete-custom-object.ts`, `delete-all-custom-objects.ts`,
  `create.ts` round out inspection/cleanup tooling for the custom-object-backed data
  model.

## Distinctive capability

There is no starter to diff against — the whole repo is the distinctive thing: a
five-service cart-abandonment-to-conversion funnel where commercetools Custom Objects
(not a database) hold every stage of state, Merchant Center is the authoring surface
for both the abandonment rules and the email copy, and Google Cloud Pub/Sub push
subscriptions (rather than commercetools Subscriptions filtered server-side, or a CT
API Extension) carry the event-driven half of the flow.
