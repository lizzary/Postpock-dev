// Presets for MCP key permissions, and how a set of permissions reads back as one of them.
import { MCP_PERMISSIONS } from '../../../bridge/index.js';

export const CATEGORIES = Object.keys(MCP_PERMISSIONS);           // platform · author · post
const LOOK = { platform: 'query', author: 'query', post: 'view' };
const EDIT = { platform: ['edit'], author: ['edit'], post: ['editMeta'] };

const build = (has, exportOn) => ({
  ...Object.fromEntries(CATEGORIES.map((c) => [c, Object.fromEntries(MCP_PERMISSIONS[c].map((p) => [p, has(c, p)]))])),
  export: exportOn,
});

export const PRESETS = {
  /** look, nothing else */
  read: () => build((c, p) => p === LOOK[c], false),
  /** look, and tidy up details (names, covers, order, dates) */
  organize: () => build((c, p) => p === LOOK[c] || EDIT[c].includes(p), false),
  full: () => build(() => true, true),
};
export const PRESET_NAMES = Object.keys(PRESETS);

const same = (a, b) => CATEGORIES.every((c) => MCP_PERMISSIONS[c].every((p) => !!a[c]?.[p] === !!b[c]?.[p])) && !!a.export === !!b.export;
export const presetOf = (perms) => PRESET_NAMES.find((name) => same(perms, PRESETS[name]())) ?? 'custom';

export const emptyPermissions = () => build(() => false, false);
