// File-name rules for export templates (Windows semantics, since the app ships as an .exe).
//
// A template is a list of tokens:
//   { type: 'text', text }                         free text; '/' and '\' separate directories
//   { type: 'key', kind: 'agg' | 'data', id, fmt } a key that expands per exported file

/** Characters that can never appear in a file name. Separators are handled separately. */
const ILLEGAL = /[<>:"|?*\u0000-\u001f]/g;
const SEP = /[\\/]/;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/** Remove characters that cannot be typed into a template. */
export function stripIllegal(text) {
  let removed = 0;
  const out = text.replace(ILLEGAL, () => { removed++; return ''; });
  return { text: out, removed };
}

const FULLWIDTH = { '<': '＜', '>': '＞', ':': '：', '"': '＂', '|': '｜', '?': '？', '*': '＊', '/': '／', '\\': '＼' };

/** Make an expanded value safe for one path segment (it never introduces a directory). */
export function sanitizeValue(value) {
  let s = String(value ?? '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[<>:"|?*/\\]/g, (c) => FULLWIDTH[c]);
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Trailing dots and spaces are dropped by Windows; reserved device names get a suffix. */
export function finishSegment(seg) {
  let s = seg.replace(/[. ]+$/g, '');
  if (RESERVED.test(s)) s = `${s}_`;
  return s;
}

/**
 * Structural problems of a template. Returns [{ code }]:
 *   empty · absolute · dotSegment · emptySegment · noFileName · reserved · trailingDot
 */
export function validateTemplate(tokens) {
  const errors = [];
  const add = (code) => { if (!errors.some((e) => e.code === code)) errors.push({ code }); };
  if (!tokens.length || tokens.every((t) => t.type === 'text' && !t.text.trim())) { add('empty'); return errors; }
  // Shape: keys become a placeholder so text-only segments can be checked.
  const KEY = '\u0001';
  const shape = tokens.map((t) => (t.type === 'key' ? KEY : t.text)).join('');
  if (SEP.test(shape[0])) add('absolute');
  const segs = shape.split(SEP);
  segs.forEach((seg, i) => {
    const last = i === segs.length - 1;
    const text = seg.trim();
    if (!text) {
      if (i === 0 && SEP.test(shape[0])) return;            // already reported as absolute
      add(last ? 'noFileName' : 'emptySegment');
      return;
    }
    if (!seg.includes(KEY)) {
      if (text === '.' || text === '..') add('dotSegment');
      else if (RESERVED.test(text)) add('reserved');
      else if (/[. ]$/.test(seg) && !last) add('trailingDot');
    }
  });
  return errors;
}

/** Split an expanded path into segments. */
export const splitPath = (s) => s.split(SEP);

/** "name(1).ext" style de-duplication (case-insensitive, like Windows). */
export function uniqueName(base, ext, taken) {
  const make = (n) => `${base}${n ? `(${n})` : ''}${ext ? `.${ext}` : ''}`;
  let n = 0;
  while (taken.has(make(n).toLowerCase())) n++;
  const name = make(n);
  taken.add(name.toLowerCase());
  return name;
}
