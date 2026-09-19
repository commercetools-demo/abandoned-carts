# Features

Code-derived inventory of what this repo implements. Bullets and key file paths.

_Last generated: 2026-09-18._

A commercetools Connect connector, built from scratch rather than forked from a
storefront starter. Five applications (`connect.yaml`): a Merchant Center Custom
Application (`mc-app`), an HTTP `service` that does the finding, a cron `job` that
triggers it, and two event handlers (`mail-sender`, `order-created-event`) fed by
Pub/Sub topics Connect provisions. commercetools Custom Objects are the entire
system of record — there is no database.

## Cart abandonment detection (`job` + `service`)

- The scheduled job posts to the service every five minutes (`connect.yaml`
  `job.properties.schedule: */5 * * * *`, `job/src/controllers/job.controller.ts`).
  It resolves the endpoint with `new URL` against an absolute path, so
  `ABANDONED_CART_SERVICE_URL` works whether it holds the origin or the full
  endpoint URL Connect reports.
- The service pages through every `Active` cart whose `lastModifiedAt` falls inside
  the configured window — older than `abandonAfterHours`, newer than
  `ignoreCartsOlderThan` days — and that is not already flagged, in one CT query
  predicate (`service/src/services/abandoned-cart.service.ts`).
- The recipient comes from `cart.customerEmail`, and from the customer record when
  the cart carries none. A storefront that signs a customer in without calling
  `setCustomerEmail` leaves that field empty on every cart it makes, so reading
  only it finds nothing to do and reports a clean run.
- Empty carts are skipped and counted: a cart with no line items is a visit, not an
  abandoned purchase.
- `ABANDONED_CART_MAX_PER_RUN` (default 10) bounds one run. A Project with a backlog
  of stale carts would otherwise record all of them at once, and mail every one of
  those shoppers because of an install. What the cap held back is reported from the
  query's own total, not from what the loop happened to reach.
- Each recorded cart gets an `abandoned-carts/{cartId}` Custom Object holding email,
  total, currency, abandonment date and item count, and — unless
  `ABANDONED_CART_MARK_CARTS=false` — `custom.abandoned = true` on the cart itself.
- **Marking never takes a Cart's custom Type away from whoever set it.** A Cart
  carries exactly one and `setCustomType` replaces rather than merges, so every field
  the incoming Type does not define is dropped, silently. The connector therefore sets
  the Type only on a cart that has none, sets just the field on a cart already carrying
  its own, and leaves a cart carrying anybody else's alone
  (`markAction` in `service/src/services/abandoned-cart.service.ts`).
- `ABANDONED_CART_TYPE_KEY` (default `abandoned-cart-custom`) names that Type, so a
  Project where several applications write on carts can point them all at one Type and
  have each own its own fields inside it. `specialized-poc` runs this way: the
  connector, a cart API Extension and a B2B portal all share `specialized-order`.
- A cart is never recorded twice: the service reads
  `abandoned-carts/{cartId}` before writing. Correctness does not depend on the cart
  flag, which is best-effort and logged when it fails.
- Every run writes `abandoned-cart/service-log` — counts, each skip reason, duration,
  the configuration used, and whether marking was on. A failed run writes the same
  object with `status: "error"` and the message.
- Per-cart failures are caught so one bad cart cannot abort the batch.
- The rules live in the `abandoned-cart/configuration` Custom Object, not in env
  vars, so the window and the copy change from the Merchant Center without a
  redeploy.
- `postDeploy` creates the Type if it is absent and otherwise adds only the
  `abandoned` field to it, leaving every other field in place. It never deletes one:
  deleting a Type detaches it from every Cart carrying it, which would un-mark every
  cart the connector has recorded and mail all of those shoppers again
  (`service/src/connector/actions.ts`).

## Email (`mail-sender`)

- A Change Subscription on `key-value-document`, created by `postDeploy`
  (`mail-sender/src/connector/actions.js`). Change Subscriptions cannot be filtered
  by container, so every Custom Object write in the Project arrives and
  `isAbandonedCartMessage` rejects it in one comparison before anything is fetched
  (`mail-sender/src/validators/message.validators.js`).
- The work happens before the acknowledgement. Acknowledging first can never miss
  the ten-second window, but the platform is free to freeze the instance once a
  response has been sent, so the send that was supposed to follow may never run.
- Delivery is **Resend**, over `fetch` with a five-second timeout — an event
  application must acknowledge within ten seconds, so a slow mail API loses rather
  than taking the whole delivery down (`mail-sender/src/handlers/generic.handler.js`).
- `ABANDONED_CART_DEMO_RECIPIENT` sends every message to one inbox instead of the
  shopper's, with a footer naming who it was addressed to. A demo Project's carts
  carry whatever addresses people typed into the storefront; this keeps delivery
  real while making it impossible to reach anyone who did not ask.
- Without `RESEND_API_KEY` the connector still runs end to end: the message is
  rendered and recorded, and nothing is sent.
- `[firstName]` in the merchandiser's template is substituted from the customer
  record. With no template stored, a plain summary is generated from the cart
  (`generateHtmlFromTemplateData`).
- The attempt is recorded on the Custom Object either way —
  `emailAttemptedDate`, `emailDeliveredTo`, `emailDeliveryDetail`, the subject and
  the body as sent. `emailSentDate` is set only on a real delivery, so a failure
  stays visible as "Not sent" with the reason next to it.
- A redelivery finds `emailSentDate` already set and stops. The Subscription
  promises at-least-once, so this is what keeps one restock from mailing a shopper
  twice.

## Order conversion tracking (`order-created-event`)

- `postDeploy` creates an `OrderCreated` Subscription keyed to this connector, so it
  cannot collide with a Project's own order Subscriptions — which commonly exist
  alongside it (`order-created-event/src/connector/actions.ts`).
- Resolves the originating cart from the order and stamps
  `cartConvertedDate` on its `abandoned-carts/{cartId}` object — the Cart Converted
  column in the Merchant Center application.
- Every path acknowledges. The queue retries anything that is not 2xx for seven
  days, and none of these becomes handleable on a retry: a malformed body, a
  different message type, an order with no cart, or a cart nobody recorded.

## Merchant Center administration (`mc-app`)

- Three screens — Configuration, Abandoned Carts, Service Administration
  (`mc-app/src/routes.jsx`).
- **Configuration** sets the two boundaries, the email subject and a rich-text body,
  and offers the Project's cart discounts whose predicate contains
  `custom.abandoned = true`. The abandonment window accepts quarter-hours, so the
  behaviour can be shown without waiting for one.
- **Abandoned Carts** is a sortable table over the `abandoned-carts` container —
  email, total, abandonment date, email-sent date, converted date — with a row click
  that opens the underlying Custom Object as JSON.
- **Service Administration** shows the last run from `abandoned-cart/service-log`,
  including what each skip reason accounted for and what the per-run cap held back,
  and a Run now button that triggers the same endpoint the schedule calls.
- The entry point path is read from the environment. Merchant Center entry point
  paths are globally unique, so a registration may have to use something other than
  the obvious name — and the permission keys are derived from it, so a hardcoded
  constant that disagrees produces an application that loads and refuses every user
  (`mc-app/src/constants.js`).
- OAuth scopes cover Custom Objects as well as orders. Every screen reads or writes
  Custom Objects, so without `view_key_value_documents` /
  `manage_key_value_documents` the rules cannot be saved and the queue comes up
  empty.

## commercetools integration and data model

- Custom Objects are the whole system of record:
  - `abandoned-cart` / `configuration` — the rules, the discount choice, the copy
  - `abandoned-cart` / `service-log` — the last run
  - `abandoned-carts` / `{cartId}` — one record per cart, carrying its whole
    lifecycle: recorded → emailed → converted
- The Type named by `ABANDONED_CART_TYPE_KEY` puts the `abandoned` boolean on carts
  (resource type `order`, which is what Carts use), driving both the detection
  predicate and the Cart Discount that can be offered in the email.
- Connect generates one API Client for the connector with five scopes —
  `manage_key_value_documents`, `manage_orders`, `view_customers`,
  `manage_subscriptions`, `manage_types`. Nothing that can write a product or price.
- Two Pub/Sub topics, both provisioned by Connect and named by no code in the
  repository: Custom Object changes to `mail-sender`, `OrderCreated` to
  `order-created-event`.

## Not implemented

- The discount chosen in Configuration is stored and nothing reads it back. The
  connector does not apply a discount to a cart; the intended path is a Cart
  Discount whose predicate matches the `abandoned` flag, which a merchandiser
  creates in the Merchant Center.
- An order placed from a cart that was never recorded leaves nothing to mark.
  Conversion tracking measures carts this connector chased, not all carts.

## Local gate

`./scripts/predeploy.sh` runs what Connect runs, in Connect's order: install from
the lockfile, `npm audit --audit-level=high`, typecheck, lint, build, unit tests —
36 tests across four applications. The audit is in there because Connect's SCA scan
is what rejects a Connector and its report names only the stage that failed. The
scan reads the whole repository, not just the applications `connect.yaml` names.

`scripts/connect.mjs` drives registration and deployment: `status`, `register`,
`deploy`, `wire`, `logs`.
