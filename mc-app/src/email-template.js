/**
 * What an abandoned-cart email may say, and how it is filled in.
 *
 * This file is a COPY of `mail-sender/src/email-template.js`. This
 * application authors the template and previews it with these functions;
 * the mail-sender renders and sends it with the same ones. They must agree
 * exactly on the placeholder syntax and on the substitution, or a
 * merchandiser inserts something the sender cannot fill and a shopper
 * receives `{{cartTotal}}` in their inbox.
 *
 * Edit `mail-sender/src/email-template.js` and copy it here, never the
 * other way round. `mail-sender/tests/unit/contract-copies.spec.js` fails
 * when the two drift.
 *
 * Zero imports on purpose: it has to load in a Node event handler and in a
 * browser bundle.
 */

/** Custom-object container and key the configuration lives in. */
export const CONFIG_CONTAINER = 'abandoned-cart';
export const CONFIG_KEY = 'configuration';

/**
 * Every placeholder a template may use, and nothing else.
 *
 * This list is the contract. The editor builds its drop-down from it, the
 * validator refuses to save a name that is not here, and `templateVarsFor`
 * fills exactly these. Adding one means adding it in all three places at
 * once — which is the point of them being one list.
 *
 * `example` is what the preview shows, so it has to look like real data
 * rather than like a label: a merchandiser judges the line length and the
 * tone from it.
 */
export const TEMPLATE_VARIABLES = [
  {
    name: 'firstName',
    description:
      "The shopper's first name, or “there” when the cart has no customer.",
    example: 'Jen',
  },
  {
    name: 'lastName',
    description: "The shopper's last name. Empty for a guest.",
    example: 'Okafor',
  },
  {
    name: 'cartTotal',
    description:
      'What is in the cart, as an amount — 129.00, without a symbol.',
    example: '129.00',
  },
  {
    name: 'currency',
    description: 'ISO currency of the cart total, e.g. USD.',
    example: 'USD',
  },
  {
    name: 'itemCount',
    description: 'How many line items the cart holds.',
    example: '3',
  },
  {
    name: 'abandonedOn',
    description: 'The date the cart was last touched.',
    example: '12 September 2026',
  },
];

const KNOWN = new Set(TEMPLATE_VARIABLES.map((v) => v.name));

/** `{{name}}` — the one syntax the editor and the renderer agree on. */
export const TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * The syntax templates were written in before this contract existed.
 *
 * `[firstName]` was the only placeholder the sender ever substituted.
 * Templates saved then are still in live Projects, so both halves keep
 * reading it: the sender rewrites it before rendering, and the editor parses
 * it into a chip that saves back as `{{firstName}}`. Opening an old template
 * and saving it is the whole migration — there is no script to run and no
 * moment where a Project has a template neither half understands.
 */
export const LEGACY_TOKEN = /\[\s*firstName\s*\]/g;

/** Rewrite the pre-contract syntax. Safe to call on anything. */
export function upgradeLegacyTokens(text) {
  return String(text ?? '').replace(LEGACY_TOKEN, '{{firstName}}');
}

// ─── Filling one in ───────────────────────────────────────────────────────

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * A readable date, or the raw value when it is not a date at all.
 *
 * `abandonmentDate` comes off a Custom Object written by another
 * application, so it is a string this one did not produce. Printing
 * "Invalid Date" into a customer's email is worse than printing the
 * timestamp.
 */
function readableDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Everything a rendered email needs, derived from what the sender has.
 *
 * `firstName` falls back to "there" rather than to an empty string: "Hi ,"
 * is the kind of sentence that reaches a customer, and the sender has
 * always made this substitution.
 */
export function templateVarsFor(data = {}) {
  return {
    firstName: data.firstName || 'there',
    lastName: data.lastName || '',
    cartTotal: data.cartTotal ?? '',
    currency: data.currencyCode || '',
    itemCount: data.itemCount == null ? '' : String(data.itemCount),
    abandonedOn: readableDate(data.abandonmentDate),
  };
}

/**
 * Stand-in values for the preview, built from the same list.
 *
 * Derived from `TEMPLATE_VARIABLES` rather than written out separately, so
 * a variable added to the contract cannot show up in the preview as an
 * unfilled `{{…}}` while looking correct everywhere else.
 */
export function exampleVars() {
  const vars = {};
  for (const variable of TEMPLATE_VARIABLES)
    vars[variable.name] = variable.example;
  return vars;
}

/**
 * Substitute into the authored HTML.
 *
 * Values are escaped, the template is not — the template IS markup, written
 * by the editor. A catalogue or customer value containing `<` reaches the
 * reader as that character rather than opening a tag.
 *
 * An unknown placeholder is left standing rather than blanked, so a typo
 * that somehow got past validation is visible as `{{frstName}}` instead of
 * becoming a silent gap in a sentence.
 */
export function renderHtmlTemplate(html, vars) {
  return upgradeLegacyTokens(html).replace(TOKEN, (whole, name) =>
    name in vars ? escapeHtml(vars[name]) : whole
  );
}

/** The same substitution for a field that carries no markup — the subject. */
export function renderTextTemplate(text, vars) {
  return upgradeLegacyTokens(text).replace(TOKEN, (whole, name) =>
    name in vars ? String(vars[name] ?? '') : whole
  );
}

/**
 * A plain-text twin derived from the HTML, never authored separately.
 *
 * Two bodies drift: someone edits the rich one and the text one still
 * describes last season's offer. Deriving it means the text part is always
 * the message that was actually sent.
 */
export function htmlToPlainText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Refusing to save something unsendable ────────────────────────────────

/** Placeholder names used that this cannot fill. */
export function unknownPlaceholders(text) {
  const found = new Set();
  for (const match of String(text ?? '').matchAll(TOKEN)) {
    if (!KNOWN.has(match[1])) found.add(match[1]);
  }
  return [...found];
}

/**
 * Brace sequences that are nearly a placeholder.
 *
 * A dropped brace stops matching TOKEN, so it is never substituted and is
 * mailed exactly as typed. It looks like nothing is wrong right up until a
 * customer reads `{{firstName}`.
 */
export function malformed(text) {
  const problems = [];
  const source = String(text ?? '');

  for (const match of source.matchAll(/\{\{[^}]*\}(?!\})/g)) {
    problems.push(`${match[0]} is missing its closing brace`);
  }
  for (const match of source.matchAll(/(?<!\{)\{[^{}]+\}(?!\})/g)) {
    const inner = match[0].slice(1, -1).trim();
    if (KNOWN.has(inner)) {
      problems.push(`${match[0]} uses single braces — write {{${inner}}}`);
    }
  }
  return problems;
}

/**
 * Everything wrong with a template, worst first.
 *
 * Errors block saving. The editor cannot produce most of them — a chip is
 * indivisible — but a template can also arrive from a Project that predates
 * the editor, or be written straight into the Custom Object.
 */
export function validateTemplate(template = {}) {
  const subject = String(template.subject ?? '');
  const body = String(template.body ?? '');
  const both = `${subject}\n${body}`;
  const problems = [];

  if (!subject.trim()) {
    problems.push({ severity: 'error', message: 'The subject is empty.' });
  }
  // An "empty" rich-text body is still markup — `<p></p>` — so emptiness is
  // judged on the text inside it, not on the HTML's length.
  if (!htmlToPlainText(body).trim()) {
    problems.push({ severity: 'error', message: 'The body is empty.' });
  }

  for (const detail of malformed(both)) {
    problems.push({
      severity: 'error',
      message: `Broken placeholder: ${detail}.`,
    });
  }

  for (const name of unknownPlaceholders(both)) {
    problems.push({
      severity: 'error',
      message: `{{${name}}} is not a placeholder this can fill — it would be sent literally.`,
    });
  }

  if (!/\{\{\s*firstName\s*\}\}/.test(both) && !LEGACY_TOKEN.test(both)) {
    problems.push({
      severity: 'warning',
      message:
        'Nothing addresses the shopper by name. {{firstName}} usually belongs here.',
    });
  }
  // `LEGACY_TOKEN` is a global regex, so its lastIndex survives the test
  // above and the next call would start mid-string.
  LEGACY_TOKEN.lastIndex = 0;

  return problems;
}

/**
 * What a Project gets before anyone edits it.
 *
 * Deliberately short. A merchandiser is far more likely to rewrite a
 * three-line email than to trim a page of placeholder prose, and every
 * variable it uses is one the sender can fill.
 */
export const DEFAULT_TEMPLATE = {
  subject: 'You left something behind, {{firstName}}',
  body: [
    '<p>Hi {{firstName}},</p>',
    '<p>Your cart still has {{itemCount}} item(s) in it, coming to {{cartTotal}} {{currency}}.</p>',
    '<p>We have held nothing back for you, so it is first come, first served.</p>',
    '<p><small>You are receiving this because you left a cart with us on {{abandonedOn}}.</small></p>',
  ].join(''),
};
