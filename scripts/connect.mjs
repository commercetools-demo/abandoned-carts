#!/usr/bin/env node
/**
 * Register and deploy this connector with commercetools Connect.
 *
 *   node scripts/connect.mjs status
 *   node scripts/connect.mjs register --tag 1.1.2
 *   node scripts/connect.mjs deploy
 *   node scripts/connect.mjs wire          # second pass: the assigned URLs
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

function configurations({ serviceUrl, applicationUrl }) {
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
      ],
    },
    { applicationName: 'job', standardConfiguration: [] },
    {
      applicationName: 'mail-sender',
      standardConfiguration: mailSenderStandard,
      securedConfiguration: mailSenderSecured,
    },
    { applicationName: 'order-created-event', standardConfiguration: [] },
  ].map((c) => ({
    ...c,
    // Inherited keys are supplied per application; Connect matches them
    // against `inheritAs.configuration` in connect.yaml.
    standardConfiguration: [
      ...(c.standardConfiguration ?? []),
      { key: 'CTP_REGION', value: env.CTP_REGION ?? 'us-central1.gcp' },
      { key: 'ABANDONED_CART_SERVICE_URL', value: serviceUrl },
    ],
  }));
}

/** Where Connect put each application, once it has told us. */
function urls(dep) {
  const out = {};
  for (const app of dep?.details?.applications ?? []) out[app.applicationName] = app.url;
  return out;
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
  for (const [name, url] of Object.entries(urls(dep))) console.log(`  ${name.padEnd(22)} ${url}`);
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
      serviceUrl: 'http://localhost:8080',
      applicationUrl: env.APPLICATION_URL ?? 'https://placeholder.commercetools.app',
    }),
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

  const updated = await connect('POST', `/${projectKey}/deployments/key=${DEPLOYMENT_KEY}`, {
    version: dep.version,
    actions: [
      {
        action: 'redeploy',
        configurations: configurations({ serviceUrl, applicationUrl }),
      },
    ],
  });
  console.log(`redeploying with:\n  service  ${serviceUrl}\n  mc-app   ${applicationUrl}`);
  console.log(`status ${updated.status}`);
  console.log(
    '\nSet the Custom Application\'s Application URL in the Merchant Center to\n' +
      `  ${applicationUrl}\n` +
      'and change its state from Draft to Ready, then install it into the Project.'
  );
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

const commands = {
  status: cmdStatus,
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
