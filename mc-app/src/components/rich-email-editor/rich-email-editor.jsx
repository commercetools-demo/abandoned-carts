import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import {
  createEditor,
  Editor,
  Element as SlateElement,
  Transforms,
} from 'slate';
import { withHistory } from 'slate-history';
import {
  Editable,
  ReactEditor,
  Slate,
  useSelected,
  useSlate,
  withReact,
} from 'slate-react';
import { TEMPLATE_VARIABLES } from '../../email-template';

/**
 * A rich text editor whose placeholders cannot be broken.
 *
 * ── Why variables are Slate nodes, not text ──────────────────────────────
 * A placeholder written as the literal characters `{{firstName}}` is one
 * backspace away from `{{firstName}`, which stops matching the placeholder
 * pattern, is never substituted, and is mailed to a customer exactly as
 * written. Here each one is an INLINE VOID node: Slate treats it as a
 * single indivisible thing, so backspace removes the whole chip, the caret
 * steps over it rather than into it, and there is no way to type half of
 * one.
 *
 * Void means Slate never renders or edits its interior. Inline means it
 * flows in a paragraph rather than sitting on its own line.
 *
 * This replaces `@commercetools-uikit/rich-text-input`, which is a fine
 * general-purpose field and knows nothing about placeholders — in it
 * `{{firstName}}` is twelve ordinary characters.
 *
 * ── HTML is the storage format ───────────────────────────────────────────
 * Serialised to HTML with the chips written back out as `{{name}}`, which
 * is what the mail-sender substitutes into. Deserialising splits those
 * tokens back into chips, so a saved template round-trips. The pre-contract
 * `[firstName]` parses into a chip too, so opening an old template and
 * saving it migrates it.
 */

const KNOWN = new Set(TEMPLATE_VARIABLES.map((v) => v.name));

/** `{{name}}`, plus the legacy `[firstName]`, in one pass. */
const TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}|\[\s*(firstName)\s*\]/g;

// ─── Serialising ──────────────────────────────────────────────────────────

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeNode(node) {
  if (SlateElement.isElement(node) && node.type === 'variable') {
    let token = `{{${node.name}}}`;
    if (node.bold) token = `<strong>${token}</strong>`;
    if (node.italic) token = `<em>${token}</em>`;
    return token;
  }
  if (!SlateElement.isElement(node)) {
    // A newline inside a run is a line break the author typed or a `<br>`
    // that was parsed in. HTML collapses a literal newline to a space, so
    // writing one back out would quietly join two lines into one.
    let text = escapeHtml(node.text).replace(/\n/g, '<br>');
    if (!text) return '';
    if (node.bold) text = `<strong>${text}</strong>`;
    if (node.italic) text = `<em>${text}</em>`;
    return text;
  }
  const inner = node.children.map(serializeNode).join('');
  switch (node.type) {
    case 'bulleted-list':
      return `<ul>${inner}</ul>`;
    case 'list-item':
      return `<li>${inner}</li>`;
    default: {
      // An empty paragraph is a blank line the author left on purpose, and
      // `<p></p>` is not one in most mail clients.
      const body = inner || '<br>';
      return node.small ? `<p><small>${body}</small></p>` : `<p>${body}</p>`;
    }
  }
}

export function toHtml(value) {
  return value.map(serializeNode).join('');
}

/**
 * The same document as plain text, for a field that cannot carry markup.
 *
 * An email SUBJECT is shown verbatim by every mail client, so a `<strong>`
 * in one arrives as literal characters. Chips still serialise to
 * `{{name}}`, which is what the renderer substitutes.
 */
function textOf(node) {
  if (SlateElement.isElement(node)) {
    return node.type === 'variable'
      ? `{{${node.name}}}`
      : node.children.map(textOf).join('');
  }
  return node.text;
}

export function toText(value) {
  return value.map(textOf).join(' ').replace(/\s+/g, ' ').trim();
}

// ─── Deserialising ────────────────────────────────────────────────────────

/** Split a text run on a placeholder, turning known names into chips. */
function withVariables(text, marks) {
  const out = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    const name = match[1] ?? match[2];
    if (at > last) out.push({ text: text.slice(last, at), ...marks });
    if (KNOWN.has(name)) {
      out.push({ type: 'variable', name, ...marks, children: [{ text: '' }] });
    } else {
      // An unknown token stays literal text, so a typo is visible in the
      // editor as `{{frstName}}` rather than vanishing into a chip.
      out.push({ text: match[0], ...marks });
    }
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), ...marks });
  return out.length ? out : [{ text: '', ...marks }];
}

export function fromText(text) {
  return [
    { type: 'paragraph', children: withVariables(String(text ?? ''), {}) },
  ];
}

function fromDom(node, marks = {}) {
  // 3 is Node.TEXT_NODE. Spelled numerically because Slate exports its own
  // `Node`, which shadows the DOM one in this module.
  if (node.nodeType === 3) {
    return withVariables(node.textContent ?? '', marks);
  }
  const el = node;
  const tag = el.nodeName.toLowerCase();
  const next =
    tag === 'strong' || tag === 'b'
      ? { ...marks, bold: true }
      : tag === 'em' || tag === 'i'
      ? { ...marks, italic: true }
      : marks;

  const children = Array.from(el.childNodes).flatMap((c) => fromDom(c, next));

  switch (tag) {
    case 'p':
    case 'div': {
      // `<p><small>…</small></p>` is a fine-print paragraph. Read the
      // wrapper off here rather than in a `small` case, so the flag lands
      // on the paragraph that serialisation writes it back from.
      const only = el.children.length === 1 ? el.children[0] : null;
      const small = only?.nodeName.toLowerCase() === 'small';
      const inner = small
        ? Array.from(only.childNodes).flatMap((c) => fromDom(c, next))
        : children;
      return [
        {
          type: 'paragraph',
          ...(small ? { small: true } : {}),
          children: inner.length ? inner : [{ text: '' }],
        },
      ];
    }
    case 'ul':
      return [
        {
          type: 'bulleted-list',
          children: children.length ? children : [{ text: '' }],
        },
      ];
    case 'li':
      return [
        {
          type: 'list-item',
          children: children.length ? children : [{ text: '' }],
        },
      ];
    case 'br':
      return [{ text: '\n' }];
    default:
      return children;
  }
}

const EMPTY = [{ type: 'paragraph', children: [{ text: '' }] }];

export function fromHtml(html) {
  if (!String(html ?? '').trim()) return EMPTY;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.childNodes).flatMap((n) => fromDom(n));
  const blocks = nodes.filter(
    (n) => SlateElement.isElement(n) && n.type !== 'variable'
  );
  // Loose inline content at the top level still needs a paragraph to live in.
  return blocks.length
    ? nodes.filter((n) => SlateElement.isElement(n))
    : [{ type: 'paragraph', children: nodes }];
}

// ─── The editor ───────────────────────────────────────────────────────────

const Chip = ({ attributes, children, element }) => {
  const selected = useSelected();
  return (
    <span
      {...attributes}
      contentEditable={false}
      title={
        TEMPLATE_VARIABLES.find((v) => v.name === element.name)?.description
      }
      style={{
        background: selected ? '#c8d9ff' : '#e6edff',
        border: '1px solid #b9ccff',
        borderRadius: 10,
        padding: '1px 7px',
        margin: '0 1px',
        fontSize: 12.5,
        fontWeight: element.bold ? 700 : undefined,
        fontStyle: element.italic ? 'italic' : undefined,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {element.name}
      {children}
    </span>
  );
};
Chip.displayName = 'Chip';
Chip.propTypes = {
  attributes: PropTypes.object.isRequired,
  children: PropTypes.node,
  element: PropTypes.object.isRequired,
};

const renderElement = (props) => {
  const { attributes, children, element } = props;
  switch (element.type) {
    case 'variable':
      return <Chip {...props} />;
    case 'bulleted-list':
      return (
        <ul {...attributes} style={{ paddingLeft: 22, margin: '0 0 8px' }}>
          {children}
        </ul>
      );
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    default:
      return (
        <p
          {...attributes}
          style={{
            margin: '0 0 8px',
            ...(element.small ? { fontSize: '0.85em', color: '#666' } : {}),
          }}
        >
          {children}
        </p>
      );
  }
};

const renderLeaf = ({ attributes, children, leaf }) => {
  let out = children;
  if (leaf.bold) out = <strong>{out}</strong>;
  if (leaf.italic) out = <em>{out}</em>;
  return <span {...attributes}>{out}</span>;
};

function isMarkActive(editor, mark) {
  return Editor.marks(editor)?.[mark] === true;
}

function toggleMark(editor, mark) {
  if (isMarkActive(editor, mark)) Editor.removeMark(editor, mark);
  else Editor.addMark(editor, mark, true);
}

const TOOLBAR_BUTTON = {
  appearance: 'none',
  background: '#fff',
  border: '1px solid #d5d5db',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  minWidth: 30,
  padding: '3px 8px',
};

const Toolbar = ({ formatting }) => {
  const editor = useSlate();
  const [picking, setPicking] = useState('');

  const insert = (name) => {
    if (!name) return;
    Transforms.insertNodes(editor, {
      type: 'variable',
      name,
      children: [{ text: '' }],
    });
    // Put the caret after the chip, not inside it — a void node has no
    // inside, and leaving the selection on one makes the next keystroke
    // replace it.
    Transforms.move(editor);
    setPicking('');
    ReactEditor.focus(editor);
  };

  return (
    <div
      style={{
        alignItems: 'center',
        background: '#fafafa',
        borderBottom: '1px solid #e3e3e8',
        display: 'flex',
        gap: 6,
        padding: '6px 8px',
      }}
    >
      {formatting && (
        <>
          <button
            type="button"
            title="Bold"
            style={{ ...TOOLBAR_BUTTON, fontWeight: 700 }}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleMark(editor, 'bold');
            }}
          >
            B
          </button>
          <button
            type="button"
            title="Italic"
            style={{ ...TOOLBAR_BUTTON, fontStyle: 'italic' }}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleMark(editor, 'italic');
            }}
          >
            I
          </button>
        </>
      )}

      <span style={{ flex: 1 }} />

      <select
        aria-label="Insert variable"
        value={picking}
        style={{ ...TOOLBAR_BUTTON, minWidth: 130 }}
        onChange={(event) => insert(event.target.value)}
      >
        <option value="">Insert variable…</option>
        {TEMPLATE_VARIABLES.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name}
          </option>
        ))}
      </select>
    </div>
  );
};
Toolbar.displayName = 'Toolbar';
Toolbar.propTypes = { formatting: PropTypes.bool };

/**
 * `mode` is 'html' for the body and 'text' for the subject, which a mail
 * client shows verbatim and so must carry no markup. Both render
 * placeholders as chips — a subject is exactly as easy to corrupt as a
 * body, and showing raw `{{firstName}}` in one field while the other shows
 * chips invites someone to hand-type the braces.
 */
const RichEmailEditor = ({ value, onChange, mode = 'html' }) => {
  const isText = mode === 'text';

  const editor = useMemo(() => {
    const e = withHistory(withReact(createEditor()));
    const { isInline, isVoid } = e;
    // The two lines the whole feature rests on.
    e.isInline = (el) => (el.type === 'variable' ? true : isInline(el));
    e.isVoid = (el) => (el.type === 'variable' ? true : isVoid(el));
    return e;
  }, []);

  const [initial] = useState(() =>
    isText ? fromText(value) : fromHtml(value)
  );

  const handleChange = useCallback(
    (next) => {
      // A selection move is not an edit. Reporting one would mark the form
      // dirty on every click.
      if (editor.operations.every((op) => op.type === 'set_selection')) return;
      onChange(isText ? toText(next) : toHtml(next));
    },
    [editor, onChange, isText]
  );

  return (
    <div
      style={{
        border: '1px solid #d5d5db',
        borderRadius: 4,
        background: '#fff',
      }}
    >
      <Slate editor={editor} initialValue={initial} onChange={handleChange}>
        <Toolbar formatting={!isText} />
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          spellCheck
          // A subject is one line: Enter would put a paragraph break into a
          // field that cannot express one.
          onKeyDown={
            isText
              ? (event) => {
                  if (event.key === 'Enter') event.preventDefault();
                }
              : undefined
          }
          style={{
            minHeight: isText ? 0 : 220,
            padding: '8px 12px',
            fontSize: 14,
            lineHeight: 1.55,
          }}
        />
      </Slate>
    </div>
  );
};
RichEmailEditor.displayName = 'RichEmailEditor';
RichEmailEditor.propTypes = {
  /** HTML with `{{name}}` tokens, or plain text when `mode` is 'text'. */
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['html', 'text']),
};

export default RichEmailEditor;
