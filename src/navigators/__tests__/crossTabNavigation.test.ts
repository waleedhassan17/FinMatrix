// ═══════════════════════════════════════════════════════
// FinMatrix — drill-downs stay on the tab they start from
// ═══════════════════════════════════════════════════════
// QA: "Back sends me to Transactions." Reports, Inventory, a customer, the
// Dashboard tiles and global search opened their documents by hopping into
// another tab's stack — navigate('TransactionsStack', { screen, initial: false }).
// Back (goBack) then popped inside THAT tab and landed on its hub, never on the
// report, item or customer the user came from.
//
// The fix registers the record screens in every tab stack
// (navigations-maps/sharedRecords.ts) and pushes locally. These guards keep it
// that way:
//   1. No hop opens a shared record screen — it must be a local push.
//   2. What hops remain (tab-level jumps, e.g. to My Requests) carry
//      `initial: false`, or back from them falls through to the Dashboard.
//   3. Every tab stack registers the shared set, and the set is closed: each
//      shared screen navigates only to shared screens or hops to a tab by name.
//      A navigate() to a name the stack does not register is dropped without
//      an error — a dead tap.
//
// The suite reads source text, which no other suite here does. That is
// deliberate: the invariants have to bind call sites that do not exist yet,
// and an import-based test can only assert about the ones written today.

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, normalize } from 'path';

import { SHARED_RECORD_ROUTE_NAMES } from '../../navigations-maps/sharedRecordRouteNames';

const SRC = join(__dirname, '..', '..');
const MAPS = join(SRC, 'navigations-maps');
const SHARED = new Set<string>(SHARED_RECORD_ROUTE_NAMES);

/** Hops whose target IS that stack's initial route, where `initial: false`
 *  would be a no-op. Initial route = the first entry of each navigations-map. */
const EXEMPT: { file: string; screen: string }[] = [
  // Dashboard's inventory card and its empty-state action.
  { file: 'screens/HomeScreen/AdminDashboardScreen.tsx', screen: 'InventoryList' },
  // Dashboard's "recent transactions" section action.
  { file: 'screens/HomeScreen/AdminDashboardScreen.tsx', screen: 'TransactionsHub' },
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : walk(full);
    }
    return /\.tsx?$/.test(full) ? [full] : [];
  });

/** Every `navigate(...)` whose first argument names a tab stack. Returns the
 *  call text up to its closing paren, and the screen it opens. */
const findHops = (source: string) => {
  const hops: { target: string; screen: string; text: string }[] = [];
  const call = /\.?navigate\(\s*(?:'(\w*Stack)'|"(\w*Stack)"|(\w+\.stack))/g;

  let match: RegExpExecArray | null;
  while ((match = call.exec(source)) !== null) {
    const target = match[1] ?? match[2] ?? match[3];
    // Walk to the matching close paren so multi-line calls are captured whole.
    let depth = 0;
    let end = match.index;
    for (let i = source.indexOf('(', match.index); i < source.length; i++) {
      if (source[i] === '(') depth++;
      else if (source[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const text = source.slice(match.index, end + 1);
    // `navigate('SomeStack')` with no screen lands on the stack's own initial
    // route. Both `screen: 'X'` and the shorthand `{ screen, … }` count.
    if (!/\bscreen\b/.test(text)) continue;
    const literal = /\bscreen\s*:\s*'(\w+)'/.exec(text);
    hops.push({ target, screen: literal?.[1] ?? '(dynamic)', text });
  }
  return hops;
};

const scanned = ['screens', 'hooks', 'components'].flatMap(dir => walk(join(SRC, dir)));
const allHops = scanned.flatMap(file => {
  const rel = file.slice(SRC.length + 1);
  return findHops(readFileSync(file, 'utf8')).map(hop => ({ ...hop, file: rel }));
});

const isExempt = (hop: { file: string; screen: string }) =>
  EXEMPT.some(e => e.file === hop.file && e.screen === hop.screen);

/** Shared route name → the screen file sharedRecords.ts registers for it. */
const sharedScreenFiles = (() => {
  const source = readFileSync(join(MAPS, 'sharedRecords.ts'), 'utf8');
  const imports = new Map<string, string>();
  for (const [, name, path] of source.matchAll(/import\s+(\w+)\s+from\s+'(\.\.\/screens\/[^']+)'/g)) {
    imports.set(name, path);
  }
  const files = new Map<string, string>();
  for (const [, title, component] of source.matchAll(/\{\s*title:\s*N\.(\w+),\s*component:\s*(\w+)\s*\}/g)) {
    const path = imports.get(component);
    if (!path) continue;
    const base = normalize(join(MAPS, path));
    const file = [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx')].find(existsSync);
    if (file) files.set(title, file);
  }
  return files;
})();

/** String-literal targets of navigate/push/replace/popTo in one file. */
const navigationTargets = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/\.(?:navigate|push|replace|popTo)\(\s*['"](\w+)['"]/g)].map(
    m => m[1],
  );

describe('drill-downs stay on the tab they start from', () => {
  it('finds the hops it is meant to be guarding', () => {
    // A regex that silently matches nothing would make the checks below
    // vacuously true. What is left: the Dashboard's tab-level jumps and the
    // staff "→ My Requests" jumps.
    expect(allHops.length).toBeGreaterThanOrEqual(4);
  });

  it.each(allHops.map(h => [`${h.file} → ${h.target}/${h.screen}`, h]))(
    '%s does not hop to a record screen',
    (_label, hop) => {
      const h = hop as { text: string; file: string; target: string; screen: string };
      if (h.screen === '(dynamic)' || SHARED.has(h.screen)) {
        throw new Error(
          `${h.file} opens ${h.screen} by hopping to ${h.target}.\n` +
            `Back from it pops inside ${h.target} — the user never returns to where they were.\n` +
            `Record screens are registered in every tab stack (navigations-maps/sharedRecords.ts): ` +
            `navigate('${h.screen === '(dynamic)' ? '<screen>' : h.screen}', params) instead.`,
        );
      }
    },
  );

  it.each(allHops.filter(h => !isExempt(h)).map(h => [`${h.file} → ${h.target}/${h.screen}`, h]))(
    '%s carries initial: false',
    (_label, hop) => {
      const h = hop as { text: string; file: string; target: string; screen: string };
      if (!/initial\s*:\s*false/.test(h.text)) {
        throw new Error(
          `${h.file} navigates to ${h.target}/${h.screen} without \`initial: false\`.\n` +
            `On a stack the user has not opened yet this leaves back going to the Dashboard ` +
            `and strands ${h.screen} on the ${h.target} tab.\n` +
            `Add \`initial: false\` alongside \`screen\`, or — if ${h.screen} is that ` +
            `stack's initial route — add it to EXEMPT in this file with a note.`,
        );
      }
    },
  );

  it('keeps the exemption list short and deliberate', () => {
    expect(EXEMPT).toHaveLength(2);
    for (const exempt of EXEMPT) {
      expect(allHops.some(h => h.file === exempt.file && h.screen === exempt.screen)).toBe(true);
    }
  });
});

describe('the shared record screens', () => {
  it.each(['Dashboard', 'Transactions', 'Reports', 'Inventory', 'More', 'StaffMore'])(
    'the %s tab stack registers them',
    map => {
      const source = readFileSync(join(MAPS, `${map}.ts`), 'utf8');
      expect(source).toMatch(/withSharedRecords(<\w+>)?\(/);
    },
  );

  it('maps every shared name to a screen file', () => {
    expect([...sharedScreenFiles.keys()].sort()).toEqual([...SHARED].sort());
  });

  it.each([...SHARED].sort().map(name => [name]))('%s only opens shared screens or tabs', name => {
    const file = sharedScreenFiles.get(name);
    if (!file) throw new Error(`No screen file found for ${name}`);
    const stray = navigationTargets(file).filter(t => !SHARED.has(t) && !/Stack$/.test(t));
    if (stray.length > 0) {
      throw new Error(
        `${file.slice(SRC.length + 1)} navigates to ${stray.join(', ')}, which is not a shared ` +
          `record screen. Every tab registers the shared set, so a tab that does not register ` +
          `${stray.join(', ')} drops that navigate() silently.\n` +
          `Add ${stray.join(', ')} to navigations-maps/sharedRecords.ts and sharedRecordRouteNames.ts.`,
      );
    }
  });

  it('keeps the closure check honest', () => {
    // The closure check above is only as good as its parse: if it found no
    // targets at all, every screen would pass.
    const targets = [...sharedScreenFiles.values()].flatMap(navigationTargets);
    expect(targets.length).toBeGreaterThanOrEqual(20);
  });
});
