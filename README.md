# Abandoned Carts

A commercetools Connect connector that notices when a cart has gone quiet,
emails the shopper who left it, and records whether they came back.

Five applications ship together because the work has five distinct shapes —
something on a schedule, something that queries, something that reacts to a
write, something that reacts to an order, and something a merchandiser uses.

| Application | Type | What it does |
| --- | --- | --- |
| `service` | `service` | Finds carts inside the abandonment window and records one Custom Object per cart |
| `job` | `job` | Runs the service on a schedule |
| `mail-sender` | `event` | Reacts to a recorded cart, renders the email and sends it through Resend |
| `order-created-event` | `event` | Marks a recorded cart as converted when its order is placed |
| `mc-app` | `merchant-center-custom-application` | The rules, the email, the queue of recorded carts, and a Run now button |

## The record

One Custom Object per abandoned cart, in the `abandoned-carts` container,
keyed by cart id. The key is the cart id and nothing else, which is what
makes the whole thing idempotent: the service will not record a cart twice,
and the mail-sender will not email one twice.

| Container | Key | Written by |
| --- | --- | --- |
| `abandoned-carts` | cart id | `service` creates it; `mail-sender` records the send on it; `order-created-event` records the conversion |
| `abandoned-cart` | `configuration` | the Merchant Center application |
| `abandoned-cart` | `service-log` | `service`, on every run |

A cart is also marked in place, with `custom.abandoned = true` on a Type the
service's `postDeploy` creates. That flag is what a Cart Discount matches on:
give a discount the predicate `custom.abandoned = true` and it becomes the
incentive the email carries.

## Two boundaries and a cap

A merchandiser sets two numbers. A cart is abandoned once it has been
untouched for `abandonAfterHours`, and too old to chase after
`ignoreCartsOlderThan` days. The window is settable in quarter-hours, so the
behaviour can be shown without waiting for one.

`ABANDONED_CART_MAX_PER_RUN` is the third number and it is not a preference.
Installing this into a Project that has been running for a while means
finding a backlog of stale carts, and without a cap the first run emails
every one of those shoppers because of an install. The cap makes the first
run a sample; what it held back goes into the service log and onto the
Service Administration screen rather than passing in silence.

## Finding the address

`cart.customerEmail` is set by whatever created the cart, and a storefront
that signs a customer in without calling `setCustomerEmail` leaves it empty
on every cart it makes. So the customer record is the fallback, and a cart
with neither is skipped and counted.

This is the difference between a connector that works and one that reports a
clean run having done nothing.

## Configuration

Connect generates the API Client and injects `CTP_PROJECT_KEY`,
`CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_SCOPE`, `CTP_API_URL` and
`CTP_AUTH_URL`. Nothing else in `connect.yaml` may declare those keys.

| Key | Application | Required | Notes |
| --- | --- | --- | --- |
| `CTP_REGION` | all | yes | `us-central1.gcp` for Google Cloud Iowa |
| `ABANDONED_CART_SERVICE_URL` | all | yes | The service's URL. Known only after the first deploy — see below |
| `ABANDONED_CART_MAX_PER_RUN` | `service` | no | Carts one run may record. Default 10 |
| `RESEND_API_KEY` | `mail-sender` | no | Unset means render and record, send nothing |
| `ABANDONED_CART_FROM` | `mail-sender` | no | Must be a domain verified in Resend |
| `ABANDONED_CART_DEMO_RECIPIENT` | `mail-sender` | no | Every email goes here instead of the shopper's address |
| `CUSTOM_APPLICATION_ID` / `ENTRY_POINT_URI_PATH` / `CLOUD_IDENTIFIER` / `APPLICATION_URL` | `mc-app` | yes | From the Custom Application registration |

**Without `RESEND_API_KEY` the connector still works end to end.** Carts are
recorded, every message is rendered and stored on the Custom Object, and the
Merchant Center shows exactly what would have been sent.

**`ABANDONED_CART_DEMO_RECIPIENT` is how a demo sends real mail safely.** A
demo Project's carts carry whatever addresses people typed into the
storefront. Set this and every email is delivered to that one inbox instead,
with a line naming who it was addressed to — a real send, through Resend,
that someone can open, that cannot reach anyone who did not ask. Leave it
unset in production.

The scopes on the generated API Client are `manage_key_value_documents`,
`manage_orders` (Carts live under the orders scope), `view_customers`,
`manage_subscriptions` and `manage_types`. Nothing that can write a product
or a price.

## Deploying takes two passes

Connect assigns each application its URL during the deployment, so two
values cannot be known when the first deployment is created:

- `ABANDONED_CART_SERVICE_URL`, which the job and the Merchant Center
  application use to reach the service;
- `APPLICATION_URL`, which the Merchant Center needs to match the registered
  Custom Application.

Deploy once with placeholders, read the assigned URLs off the deployment,
then update the deployment with the real ones. This is normal for a
multi-application Connector and is not a sign anything went wrong.

Paths are resolved with `new URL` against an absolute path, so
`ABANDONED_CART_SERVICE_URL` works whether it is set to the origin or to the
full endpoint URL Connect reports.

## Registering it with Connect

The repository is public, so the `https://` URL works. A **private**
repository must be given in the SSH form
(`git@github.com:owner/repo.git`) or Connect answers `422
GitRepositoryNotReachable`, which is indistinguishable from a repository
that does not exist.

Two smaller traps: ConnectorStaged lives at the org-level
`/connectors/drafts` with no project key in the path, while deployments are
project-scoped at `/{projectKey}/deployments`; and `isPreviewable` is a
string enum, so a truthiness check passes on `'none'`.

## What it does not catch

An order placed from a cart that was never recorded leaves nothing to mark —
`order-created-event` sees the message, finds no Custom Object, and moves
on. Conversion tracking measures carts this connector chased, not all carts.

The mail-sender's Subscription is a Change Subscription on
`key-value-document`, and those cannot be filtered by container, so every
Custom Object write in the Project reaches it. It is filtered in one
comparison before anything is fetched, but in a Project that writes Custom
Objects heavily this is real traffic.

## Developing

Everything fast enough to run before a deploy is behind one command:

```bash
./scripts/predeploy.sh
```

Audit, typecheck, lint, build and unit tests for all five applications. One
at a time with `./scripts/predeploy.sh mc-app`.

`npm audit --audit-level=high` runs first because Connect's SCA scan is what
rejects a Connector, and its report names only the stage that failed. It
also scans the **whole repository**, not just the applications named in
`connect.yaml` — a stray lockfile in a folder nothing deploys will fail the
scan exactly like a real dependency.

The entry point path is read from the environment rather than hardcoded.
Merchant Center entry point paths are globally unique across every Custom
Application, so a plain name may already be taken and the registration has
to use something else — and the permission keys are derived from it, so a
constant that disagrees produces an application that loads and then refuses
every user.

To exercise the mail-sender by hand, base64 a commercetools change message
into the Pub/Sub envelope it receives:

```bash
curl -X POST http://localhost:8081/mailSender -H 'content-type: application/json' \
  -d "{\"message\":{\"data\":\"$(printf '%s' '{"notificationType":"ResourceCreated","resource":{"typeId":"key-value-document"},"resourceUserProvidedIdentifiers":{"containerAndKey":{"container":"abandoned-carts","key":"CART_ID"}}}' | base64)\"}}"
```
