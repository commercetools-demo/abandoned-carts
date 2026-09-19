/**
 * The contract is copied, so something has to notice when a copy drifts.
 *
 * `email-template.js` exists twice: here, and in the Merchant Center
 * application. Connect builds each application from its own folder with its
 * own package.json, so no import can cross between them and there is no
 * package worth publishing for one module.
 *
 * A drift is silent in the worst way — the editor offers a placeholder the
 * sender cannot fill, everything saves, and a shopper reads `{{cartTotal}}`.
 *
 * The header paragraph differs by design (each says where its sibling is),
 * so the comparison starts after it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const MARKER = '/** Custom-object container and key';

function body(path) {
  const text = readFileSync(path, 'utf8');
  const at = text.indexOf(MARKER);
  if (at === -1) {
    throw new Error(`${path} no longer starts its body at the expected marker`);
  }
  return text.slice(at);
}

describe('the shared contract', () => {
  it('is identical in the mail-sender and the Merchant Center application', () => {
    const sender = body(join(ROOT, 'mail-sender', 'src', 'email-template.js'));
    const mcApp = body(join(ROOT, 'mc-app', 'src', 'email-template.js'));
    expect(mcApp).toBe(sender);
  });
});
