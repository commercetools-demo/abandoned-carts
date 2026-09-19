/**
 * The editor's storage format.
 *
 * A placeholder survives being edited because Slate holds it as an inline
 * void node — but it only survives being SAVED if it serialises back to
 * `{{name}}` and parses back into a node. These four functions are that
 * round trip, and a break in either direction is silent: the configuration
 * saves, and a shopper gets an email with `{{firstName}}` printed in it.
 */

import { DEFAULT_TEMPLATE } from '../../email-template';
import { fromHtml, fromText, toHtml, toText } from './rich-email-editor';

describe('the HTML round trip', () => {
  it('parses a placeholder into a chip and writes it back as a token', () => {
    const html = '<p>Hi {{firstName}}, your cart holds {{itemCount}}.</p>';
    expect(toHtml(fromHtml(html))).toBe(html);
  });

  it('keeps a placeholder atomic — one node, not fifteen characters', () => {
    const [paragraph] = fromHtml('<p>a{{cartTotal}}b</p>');
    expect(paragraph.children).toHaveLength(3);
    expect(paragraph.children[1]).toMatchObject({
      type: 'variable',
      name: 'cartTotal',
    });
  });

  it('returns the shipped default unchanged', () => {
    // Opening the screen and pressing Save with no edits must not alter the
    // template. Every tag the default uses has to survive the trip.
    expect(toHtml(fromHtml(DEFAULT_TEMPLATE.body))).toBe(DEFAULT_TEMPLATE.body);
  });

  it('preserves the marks around a placeholder', () => {
    const html = '<p><strong>Back:</strong> <em>{{cartTotal}}</em></p>';
    expect(toHtml(fromHtml(html))).toBe(html);
  });

  it('keeps a line break as a break, not as whitespace', () => {
    // HTML collapses a literal newline to a space, so a signature written
    // over two lines would come back as one.
    expect(toHtml(fromHtml('<p>See you,<br>The shop</p>'))).toBe(
      '<p>See you,<br>The shop</p>'
    );
  });

  it('keeps fine print fine, around a placeholder', () => {
    const html = '<p><small>You left a cart on {{abandonedOn}}.</small></p>';
    expect(toHtml(fromHtml(html))).toBe(html);
  });

  it('migrates the pre-contract syntax on the way in', () => {
    // Opening an old template and saving it is the whole migration.
    expect(toHtml(fromHtml('<p>Hi [firstName],</p>'))).toBe(
      '<p>Hi {{firstName}},</p>'
    );
  });

  it('leaves a name it cannot fill as literal text', () => {
    // Visible as a typo in the editor rather than disguised as a chip.
    expect(toHtml(fromHtml('<p>{{frstName}}</p>'))).toBe('<p>{{frstName}}</p>');
  });

  it('reads a template that was authored as plain text', () => {
    expect(toHtml(fromHtml('Hi {{firstName}}'))).toBe(
      '<p>Hi {{firstName}}</p>'
    );
  });

  it('escapes characters that would otherwise become markup', () => {
    expect(toHtml(fromHtml('<p>Tarmac &amp; Co</p>'))).toContain('&amp;');
  });

  it('survives an empty document, and leaves validation able to see it', () => {
    // `<p><br></p>` is how a blank line reaches a mail client. It still has
    // no text in it, which is what `validateTemplate` judges emptiness on.
    expect(toHtml(fromHtml(''))).toBe('<p><br></p>');
  });
});

describe('the plain-text round trip, for the subject line', () => {
  it('writes chips as tokens and carries no markup', () => {
    const value = fromText('You left something, {{firstName}}');
    expect(toText(value)).toBe('You left something, {{firstName}}');
    expect(toText(value)).not.toContain('<');
  });

  it('flattens rich content into something a mail client shows verbatim', () => {
    expect(
      toText(fromHtml('<p><strong>Back</strong>: {{cartTotal}}</p>'))
    ).toBe('Back: {{cartTotal}}');
  });
});
