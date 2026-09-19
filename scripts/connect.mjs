#!/usr/bin/env node
/**
 * Register and deploy this connector with commercetools Connect.
 *
 *   node scripts/connect.mjs status
 *   node scripts/connect.mjs register --tag 1.1.2
 *   node scripts/connect.mjs deploy
 *   node scripts/connect.mjs wire          # second pass: the assigned URLs
 *   node scripts/connect.mjs wire --update-connector   # and the newest tag
 *   node scripts/connect.mjs ensure        # prove postDeploy actually ran
 *   node scripts/connect.mjs logs
 *
 * Every step is idempotent, so a rerun after a failure picks up where it
 * stopped rather than starting over.
 *
 * Credentials come from the environment and are never written here:
 *
 *   CTP_PROJECT_KEY CTP_CLIENT_ID CTP_CLIENT_SECRET CTP_AUTH_URL
 *   RESEND_API_KEY                        optional; unset means render, don't send
 *   ABANDONED_CART_FROM                   optional
 *   ABANDONED_CART_DEMO_RECIPIENT         optional; one inbox for every email
 *   ABANDONED_CART_MAX_PER_RUN            optional; carts one run may record
 *   ABANDONED_CART_MARK_CARTS             optional; 'false' leaves carts alone
 *   ABANDONED_CART_TYPE_KEY               optional; the Type carrying `abandoned`
 *   CUSTOM_APPLICATION_ID                 from the Custom Application registration
 *   ENTRY_POINT_URI_PATH                  ditto, and globally unique
 *
 * The deploying client needs `manage_api_clients` as well as
 * `manage_project`: this connector asks Connect to generate its own API
 * Client, and without that scope the deployment answers 403.
 */

const KEY = 'commercetools-demo-abandoned-carts';
const REPO = 'https://github.com/commercetools-demo/abandoned-carts.git';
const DEPLOYMENT_KEY = 'abandoned-carts';

const env = process.env;
const projectKey = env.CTP_PROJECT_KEY;
const authUrl = env.CTP_AUTH_URL;

if (!projectKey || !authUrl || !env.CTP_CLIENT_ID || !env.CTP_CLIENT_SECRET) {
  console.error(
    'Set CTP_PROJECT_KEY, CTP_AUTH_URL, CTP_CLIENT_ID and CTP_CLIENT_SECRET.'
  );
  process.exit(2);
}

/**
 * Connect is a separate API from the commercetools HTTP API: different
 * host, same OAuth tokens. Deriving the host from the configured auth host
 * rather than hardcoding it means a Project that moves region does not
 * silently keep talking to the old one.
 */
const connectUrl = authUrl.replace('://auth.', '://connect.');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

let cachedToken = null;
async function token() {
  if (cachedToken && cachedToken.expires > Date.now() + 30_000) return cachedToken.value;
  const res = await fetch(`${authUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(
        `${env.CTP_CLIENT_ID}:${env.CTP_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`token request failed: HTTP ${res.status}`);
  const body = await res.json();
  cachedToken = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

async function connect(method, path, body) {
  const res = await fetch(`${connectUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await token()}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const err = new Error(`Connect ${method} ${path} -> HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

/** Drafts are org-level: no project key in the path. Deployments are not. */
const draft = () => connect('GET', `/connectors/drafts/key=${KEY}`).catch(() => null);
const deployment = () =>
  connect('GET', `/${projectKey}/deployments`).then(
    (r) => r.results.find((d) => d.key === DEPLOYMENT_KEY) ?? null
  );

function configurations({ applicationUrl }) {
  const mailSenderStandard = [];
  if (env.ABANDONED_CART_FROM)
    mailSenderStandard.push({ key: 'ABANDONED_CART_FROM', value: env.ABANDONED_CART_FROM });
  if (env.ABANDONED_CART_DEMO_RECIPIENT)
    mailSenderStandard.push({
      key: 'ABANDONED_CART_DEMO_RECIPIENT',
      value: env.ABANDONED_CART_DEMO_RECIPIENT,
    });

  const mailSenderSecured = [];
  if (env.RESEND_API_KEY)
    mailSenderSecured.push({ key: 'RESEND_API_KEY', value: env.RESEND_API_KEY });

  return [
    {
      applicationName: 'mc-app',
      standardConfiguration: [
        { key: 'CUSTOM_APPLICATION_ID', value: env.CUSTOM_APPLICATION_ID ?? '' },
        { key: 'CLOUD_IDENTIFIER', value: env.CLOUD_IDENTIFIER ?? 'gcp-us' },
        { key: 'ENTRY_POINT_URI_PATH', value: env.ENTRY_POINT_URI_PATH ?? 'abandoned-carts' },
        { key: 'APPLICATION_URL', value: applicationUrl },
      ],
    },
    {
      applicationName: 'service',
      standardConfiguration: [
        {
          key: 'ABANDONED_CART_MAX_PER_RUN',
          value: env.ABANDONED_CART_MAX_PER_RUN ?? '10',
        },
        {
          key: 'ABANDONED_CART_MARK_CARTS',
          value: env.ABANDONED_CART_MARK_CARTS ?? 'true',
        },
        {
          key: 'ABANDONED_CART_TYPE_KEY',
          value: env.ABANDONED_CART_TYPE_KEY ?? 'abandoned-cart-custom',
        },
      ],
    },
    { applicationName: 'job', standardConfiguration: [] },
    {
      applicationName: 'mail-sender',
      standardConfiguration: mailSenderStandard,
      securedConfiguration: mailSenderSecured,
    },
    { applicationName: 'order-created-event', standardConfiguration: [] },
    // DeploymentConfigurationApplication requires BOTH arrays, even empty.
  ].map((c) => ({
    applicationName: c.applicationName,
    standardConfiguration: c.standardConfiguration ?? [],
    securedConfiguration: c.securedConfiguration ?? [],
  }));
}

/**
 * `inheritAs.configuration` is supplied once, not repeated per application.
 *
 * Repeating it is rejected — `DeploymentUnknownApplicationConfigurationKey`,
 * naming the Merchant Center application, because that application's own
 * configuration block does not declare the inherited keys.
 */
function globalConfiguration({ serviceUrl }) {
  return {
    standardConfiguration: [
      { key: 'CTP_REGION', value: env.CTP_REGION ?? 'us-central1.gcp' },
      { key: 'ABANDONED_CART_SERVICE_URL', value: serviceUrl },
    ],
  };
}

/**
 * Where Connect put each application, once it has told us.
 *
 * `applications` is top-level on the Deployment, not under `details` —
 * `details` carries only the build and its stage report.
 */
function applications(dep) {
  return Object.fromEntries(
    (dep?.applications ?? []).map((a) => [a.applicationName, a])
  );
}

function urls(dep) {
  return Object.fromEntries(
    Object.entries(applications(dep))
      .filter(([, a]) => a.url)
      .map(([name, a]) => [name, a.url])
  );
}

/**
 * Connect reports a topic as a full resource path,
 * `projects/{projectId}/topics/{name}`, while a commercetools Subscription
 * wants the two halves separately. Handing it the whole path as `topic`
 * creates a Subscription that points at nothing.
 */
function pubSubDestination(topicPath) {
  const match = /^projects\/([^/]+)\/topics\/(.+)$/.exec(topicPath ?? '');
  if (!match) return null;
  return { type: 'GoogleCloudPubSub', projectId: match[1], topic: match[2] };
}

async function cmdStatus() {
  const d = await draft();
  console.log(`Connect  ${connectUrl}`);
  console.log(`Project  ${projectKey}`);
  console.log(
    d
      ? `draft      ${d.status} v${d.version}, tag ${d.repository.tag}, previewable=${d.isPreviewable}`
      : 'draft      absent'
  );
  for (const e of d?.previewableReport?.entries ?? []) {
    console.log(`  ${e.type === 'Error' ? '✗' : '·'} ${e.title}`);
  }

  const dep = await deployment();
  console.log(dep ? `deployment ${dep.status}` : 'deployment absent');
  for (const [name, app] of Object.entries(applications(dep))) {
    console.log(`  ${name.padEnd(22)} ${app.url ?? app.topic ?? ''}`);
  }
  for (const e of dep?.details?.report?.entries ?? []) {
    console.log(`  ${e.type === 'Error' ? '✗' : '·'} ${e.title} ${e.message ?? ''}`);
  }
}

async function cmdRegister() {
  const tag = arg('tag');
  if (!tag) {
    console.error('Pass --tag <git tag>.');
    process.exit(2);
  }

  let d = await draft();
  if (!d) {
    d = await connect('POST', '/connectors/drafts', {
      key: KEY,
      name: 'Abandoned Carts',
      description:
        'Finds carts that have gone quiet, emails the shopper who left one, and records whether they came back.',
      creator: { name: 'commercetools Pre-Sales', email: 'chris.boyke@commercetools.com' },
      repository: { url: REPO, tag },
      supportedRegions: [env.CONNECT_REGION ?? 'us-central1.gcp'],
    });
    console.log(`created draft ${d.id}`);
  } else if (d.repository.tag !== tag) {
    d = await connect('POST', `/connectors/drafts/key=${KEY}`, {
      version: d.version,
      actions: [{ action: 'setRepository', url: REPO, tag }],
    });
    console.log(`draft repointed at ${tag}`);
  }

  // `isPreviewable` is a STRING enum ('none' | 'pending' | 'true' | 'false'),
  // not a boolean. A truthiness check passes on 'none' and skips this step.
  if (d.isPreviewable !== 'true') {
    d = await connect('POST', `/connectors/drafts/key=${KEY}`, {
      version: d.version,
      actions: [{ action: 'updatePreviewable' }],
    });
    console.log(
      `previewable=${d.isPreviewable} — validation is asynchronous and takes a few minutes.\n` +
        'Poll with `node scripts/connect.mjs status`. The report names only the\n' +
        'stage that failed; `./scripts/predeploy.sh` answers the SCA one locally.'
    );
  }
}

async function cmdDeploy() {
  const d = await draft();
  if (!d) {
    console.error('No draft. Run `register --tag <tag>` first.');
    process.exit(1);
  }
  if (d.isPreviewable !== 'true') {
    console.error(`Draft is not previewable (isPreviewable=${d.isPreviewable}).`);
    process.exit(1);
  }
  if (await deployment()) {
    console.log('Deployment already exists. Use `wire` to update its configuration.');
    return;
  }

  // The service and application URLs do not exist until this deployment
  // does, so the first pass carries placeholders and `wire` replaces them.
  const dep = await connect('POST', `/${projectKey}/deployments`, {
    key: DEPLOYMENT_KEY,
    connector: { key: KEY, version: d.version, staged: true },
    region: env.CONNECT_REGION ?? 'us-central1.gcp',
    configurations: configurations({
      applicationUrl: env.APPLICATION_URL ?? 'https://placeholder.commercetools.app',
    }),
    globalConfiguration: globalConfiguration({ serviceUrl: 'http://localhost:8080' }),
  });
  console.log(`deployment ${dep.id} ${dep.status} — this takes up to 15 minutes.`);
}

async function cmdWire() {
  const dep = await deployment();
  if (!dep) {
    console.error('No deployment yet.');
    process.exit(1);
  }
  const found = urls(dep);
  const serviceUrl = found.service;
  const applicationUrl = found['mc-app'];
  if (!serviceUrl || !applicationUrl) {
    console.error(
      `Connect has not assigned both URLs yet (service=${serviceUrl}, mc-app=${applicationUrl}).`
    );
    process.exit(1);
  }

  // A redeploy stays on the connector version it was deployed from, so a
  // new tag reaches the Project only with `updateConnector`. Without it the
  // redeploy succeeds, reports the new configuration, and runs the old code.
  const updateConnector = arg('update-connector', false) !== false;

  const updated = await connect('POST', `/${projectKey}/deployments/key=${DEPLOYMENT_KEY}`, {
    version: dep.version,
    actions: [
      {
        action: 'redeploy',
        // `configurationValues`, not `configurations`. The draft uses one
        // name and the redeploy action the other; sending the draft's name
        // here is accepted and ignored, so the redeploy reports success and
        // changes nothing.
        configurationValues: configurations({ applicationUrl }),
        globalConfiguration: globalConfiguration({ serviceUrl }),
        ...(updateConnector ? { updateConnector: true } : {}),
      },
    ],
  });
  console.log(
    `redeploying with:\n  service  ${serviceUrl}\n  mc-app   ${applicationUrl}` +
      `\n  connector ${updateConnector ? 'moves to the latest staged version' : `stays at v${dep.connector?.version}`}`
  );
  console.log(`status ${updated.status}`);
  console.log(
    '\nSet the Custom Application\'s Application URL in the Merchant Center to\n' +
      `  ${applicationUrl}\n` +
      'and change its state from Draft to Ready, then install it into the Project.'
  );
}

/**
 * Prove the postDeploy scripts actually ran.
 *
 * On a preview deployment a connector's own postDeploy does not reliably
 * run, and the report says "Post-deployment setup succeeded" either way.
 * That is the worst shape a failure can take here: the connector is
 * deployed, healthy, and silently deaf — no Subscription, so no email ever.
 *
 * Each redeploy also gets a NEW Pub/Sub topic, so a Subscription left
 * aimed at the previous one is just as silent as none at all. This repoints
 * rather than skipping when it already exists.
 */
async function cmdEnsure() {
  const dep = await deployment();
  if (!dep) {
    console.error('No deployment yet.');
    process.exit(1);
  }

  const apps = applications(dep);

  const wanted = [
    {
      app: 'mail-sender',
      key: 'abandoned-cart-created-subscription',
      body: (destination) => ({
        destination,
        changes: [{ resourceTypeId: 'key-value-document' }],
      }),
    },
    {
      app: 'order-created-event',
      key: 'abandoned-cart-order-created-subscription',
      body: (destination) => ({
        destination,
        messages: [{ resourceTypeId: 'order', types: ['OrderCreated'] }],
      }),
    },
  ];

  for (const { app, key, body } of wanted) {
    const destination = pubSubDestination(apps[app]?.topic);
    if (!destination) {
      console.log(`${key}: Connect has not reported a topic for ${app} yet — skipped`);
      continue;
    }
    const topic = destination.topic;
    const existing = await ctGet(`/subscriptions?where=${encodeURIComponent(`key = "${key}"`)}`);
    const current = existing.results[0];

    if (current?.destination?.topic === topic) {
      console.log(`${key}: already pointed at ${topic}`);
      continue;
    }
    if (current) {
      await ctDelete(`/subscriptions/key=${key}?version=${current.version}`);
      console.log(`${key}: was aimed at ${current.destination?.topic ?? 'nothing'} — replacing`);
    }
    await ctPost('/subscriptions', { key, ...body(destination) });
    console.log(`${key}: now pointed at ${topic}`);
  }

  // The Type this deployment was configured with, not the default. Reporting
  // on a Type the deployment does not write is a green light for nothing.
  const typeKey = env.ABANDONED_CART_TYPE_KEY?.trim() || 'abandoned-cart-custom';
  const types = await ctGet(`/types?where=${encodeURIComponent(`key = "${typeKey}"`)}`);
  const type = types.results[0];

  // And the field, not just the Type. On a Project where several applications
  // share one Type, it exists long before this connector's field is on it, so
  // "present" would be true while every detection predicate matched nothing.
  if (!type) {
    console.log(`${typeKey}: MISSING — run the service postDeploy`);
  } else if (!type.fieldDefinitions.some((f) => f.name === 'abandoned')) {
    console.log(`${typeKey}: present, but has no \`abandoned\` field — run the service postDeploy`);
  } else {
    console.log(`${typeKey}: present, with the \`abandoned\` field`);
  }
}

async function cmdLogs() {
  const dep = await deployment();
  if (!dep) {
    console.error('No deployment yet.');
    process.exit(1);
  }
  const logs = await connect(
    'GET',
    `/${projectKey}/deployments/key=${DEPLOYMENT_KEY}/logs?limit=100`
  ).catch((e) => ({ error: e.body ?? e.message }));
  console.log(JSON.stringify(logs, null, 1).slice(0, 8000));
}

/** The commercetools HTTP API, for checking what postDeploy claims it did. */
const apiUrl = () => connectUrl.replace('://connect.', '://api.');
async function ct(method, path, body) {
  const res = await fetch(`${apiUrl()}/${projectKey}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await token()}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}
const ctGet = (p) => ct('GET', p);
const ctPost = (p, b) => ct('POST', p, b);
const ctDelete = (p) => ct('DELETE', p);

const commands = {
  status: cmdStatus,
  ensure: cmdEnsure,
  register: cmdRegister,
  deploy: cmdDeploy,
  wire: cmdWire,
  logs: cmdLogs,
};

const command = process.argv[2];
const run = commands[command];
if (!run) {
  console.error(`Usage: node scripts/connect.mjs <${Object.keys(commands).join('|')}>`);
  process.exit(2);
}

run().catch((e) => {
  console.error(e.status ? `HTTP ${e.status}` : '', JSON.stringify(e.body ?? e.message).slice(0, 1200));
  process.exitCode = 1;
});
