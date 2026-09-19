/**
 * What the email says, and what stops it being unsendable.
 *
 * Everything asserted here fails silently in production: a placeholder the
 * sender cannot fill reaches a customer as `{{cartTotal}}`, a customer name
 * containing markup either breaks the layout or injects into it, and a
 * template written before this contract existed stops personalising the
 * moment the syntax changes.
 */

import {
  DEFAULT_TEMPLATE,
  exampleVars,
  htmlToPlainText,
  malformed,
  renderHtmlTemplate,
  renderTextTemplate,
  templateVarsFor,
  TEMPLATE_VARIABLES,
  unknownPlaceholders,
  upgradeLegacyTokens,
  validateTemplate,
} from '../../src/email-template.js';

const CART = {
  firstName: 'Jen',
  lastName: 'Okafor',
  cartTotal: '129.00',
  currencyCode: 'USD',
  itemCount: 3,
  abandonmentDate: '2026-09-12T08:30:00.000Z',
};

describe('templateVarsFor', () => {
  it('fills every variable the contract offers', () => {
    const vars = templateVarsFor(CART);
    for (const variable of TEMPLATE_VARIABLES) {
      expect(vars).toHaveProperty(variable.name);
    }
  });

  it('greets a guest without leaving a gap', () => {
    // "Hi ," is the kind of sentence that reaches a customer.
    expect(templateVarsFor({}).firstName).toBe('there');
  });

  it('keeps a zero item count rather than blanking it', () => {
    expect(templateVarsFor({ itemCount: 0 }).itemCount).toBe('0');
  });

  it('reads the date, and passes through anything that is not one', () => {
    expect(templateVarsFor(CART).abandonedOn).toBe('12 September 2026');
    // A Custom Object written by another application can hold anything.
    // "Invalid Date" in a customer's inbox is worse than the raw value.
    expect(
      templateVarsFor({ abandonmentDate: 'last Tuesday' }).abandonedOn
    ).toBe('last Tuesday');
  });
});

describe('the shipped default', () => {
  it('leaves nothing unfilled', () => {
    const vars = templateVarsFor(CART);
    expect(renderHtmlTemplate(DEFAULT_TEMPLATE.body, vars)).not.toMatch(/\{\{/);
    expect(renderTextTemplate(DEFAULT_TEMPLATE.subject, vars)).not.toMatch(
      /\{\{/
    );
  });

  it('passes its own validation', () => {
    const errors = validateTemplate(DEFAULT_TEMPLATE).filter(
      (p) => p.severity === 'error'
    );
    expect(errors).toEqual([]);
  });

  it('renders with the example values the preview uses', () => {
    expect(
      renderHtmlTemplate(DEFAULT_TEMPLATE.body, exampleVars())
    ).not.toMatch(/\{\{/);
  });
});

describe('renderHtmlTemplate', () => {
  const vars = templateVarsFor({ ...CART, firstName: 'Tarmac & Co <b>' });

  it('escapes values so a customer name cannot become markup', () => {
    const html = renderHtmlTemplate('<p>{{firstName}}</p>', vars);
    expect(html).toContain('Tarmac &amp; Co &lt;b&gt;');
    expect(html).not.toContain('<b>');
  });

  it('leaves the template itself as markup', () => {
    expect(renderHtmlTemplate('<p><strong>Hi</strong></p>', vars)).toContain(
      '<strong>'
    );
  });

  it('leaves an unknown placeholder standing rather than blanking it', () => {
    // A silent gap in a sentence is harder to spot than a visible token.
    expect(renderHtmlTemplate('<p>{{nope}}</p>', vars)).toBe('<p>{{nope}}</p>');
  });

  it('does not let a value inject another placeholder', () => {
    expect(
      renderHtmlTemplate('<p>{{firstName}}</p>', { firstName: '{{cartTotal}}' })
    ).toBe('<p>{{cartTotal}}</p>');
  });
});

describe('the pre-contract syntax', () => {
  it('still personalises a template saved before the editor existed', () => {
    const vars = templateVarsFor(CART);
    expect(renderHtmlTemplate('<p>Hi [firstName],</p>', vars)).toBe(
      '<p>Hi Jen,</p>'
    );
  });

  it('rewrites to the current syntax', () => {
    expect(upgradeLegacyTokens('Hi [firstName]')).toBe('Hi {{firstName}}');
    expect(upgradeLegacyTokens('Hi [ firstName ]')).toBe('Hi {{firstName}}');
  });

  it('satisfies the name check, so an old template is not nagged about', () => {
    const problems = validateTemplate({
      subject: 'x',
      body: '<p>Hi [firstName]</p>',
    });
    expect(
      problems.filter((p) => /addresses the shopper/.test(p.message))
    ).toEqual([]);
  });
});

describe('validateTemplate', () => {
  const ok = {
    subject: 'Hi {{firstName}}',
    body: '<p>{{cartTotal}} waiting</p>',
  };
  const errorsOf = (t) =>
    validateTemplate(t).filter((p) => p.severity === 'error');

  it('accepts a well-formed template', () => {
    expect(errorsOf(ok)).toEqual([]);
  });

  it('rejects an empty subject', () => {
    expect(
      errorsOf({ ...ok, subject: '  ' }).some((p) =>
        /subject is empty/.test(p.message)
      )
    ).toBe(true);
  });

  it('treats an emptied rich-text body as empty', () => {
    // `<p><br></p>` is what an emptied editor produces, not an empty string.
    expect(
      errorsOf({ subject: 'x', body: '<p><br></p>' }).some((p) =>
        /body is empty/i.test(p.message)
      )
    ).toBe(true);
  });

  it('rejects a dropped brace, which would otherwise be mailed verbatim', () => {
    expect(
      errorsOf({ ...ok, body: '<p>{{firstName}</p>' }).some((p) =>
        /Broken placeholder/.test(p.message)
      )
    ).toBe(true);
  });

  it('rejects a single-brace near miss', () => {
    expect(
      errorsOf({ ...ok, body: '<p>{firstName}</p>' }).some((p) =>
        /single braces/.test(p.message)
      )
    ).toBe(true);
  });

  it('rejects a name the sender cannot fill', () => {
    expect(
      errorsOf({ ...ok, body: '<p>{{prodcutName}}</p>' }).some((p) =>
        /prodcutName/.test(p.message)
      )
    ).toBe(true);
  });

  it('warns, but does not block, when nothing uses the name', () => {
    const problems = validateTemplate({
      subject: 'Your cart',
      body: '<p>Come back</p>',
    });
    expect(problems.filter((p) => p.severity === 'error')).toEqual([]);
    expect(problems.some((p) => p.severity === 'warning')).toBe(true);
  });

  it('gives the same answer when called twice', () => {
    // LEGACY_TOKEN is a global regex; a surviving lastIndex made the second
    // call start mid-string and silently changed the verdict.
    const template = { subject: 'Hi [firstName]', body: '<p>[firstName]</p>' };
    expect(validateTemplate(template)).toEqual(validateTemplate(template));
  });
});

describe('unknownPlaceholders and malformed', () => {
  it('names each unknown once', () => {
    expect(unknownPlaceholders('{{nope}} {{nope}} {{firstName}}')).toEqual([
      'nope',
    ]);
  });

  it('ignores single braces around something that is not a variable', () => {
    expect(malformed('a {literal} phrase')).toEqual([]);
  });
});

describe('htmlToPlainText', () => {
  it('derives a readable text part', () => {
    const text = htmlToPlainText('<p>Hi Jen,</p><p>Your cart is waiting.</p>');
    expect(text).toBe('Hi Jen,\n\nYour cart is waiting.');
    expect(text).not.toContain('<');
  });

  it('keeps list items legible', () => {
    expect(htmlToPlainText('<ul><li>One</li><li>Two</li></ul>')).toContain(
      '• One'
    );
  });

  it('turns entities back into characters', () => {
    expect(htmlToPlainText('<p>Tarmac &amp; Co</p>')).toBe('Tarmac & Co');
  });
});
