// Does the stale-image probe actually fail on an old bundle?
// A check that cannot fail is worse than no check: it reports "current" for a
// week-old image and nobody notices until the deploy is live.
const probes = [
  ['\\.rh', 'background'],
  ['\\.tag', 'grid-template-columns'],
  ['\\.punch', 'grid-template-columns'],
  ['\\.tag:nth-child\\(odd\\)', 'background'],
];

function scan(css) {
  return probes.filter(([sel, decl]) => {
    const re = new RegExp(`\\[data-skin=['"]?lone-trail['"]?\\]\\s*${sel}\\s*\\{`);
    const hit = re.exec(css);
    if (!hit) return true;
    const block = css.slice(hit.index, css.indexOf('}', hit.index));
    return !block.includes(decl);
  });
}

const current = `
[data-skin=lone-trail] .rh{background:var(--fg);color:var(--bg-sheet)}
[data-skin=lone-trail] .tag{display:grid;grid-template-columns:minmax(0,1fr) auto}
[data-skin=lone-trail] .punch{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr)}
[data-skin=lone-trail] .tag:nth-child(odd){background:var(--bg-elev)}
`;

// The pre-fix bundle: .rh was a hairline rule, .tag was an inline chip,
// .punch was a single column, and there was no zebra rule at all.
const stale = `
[data-skin=lone-trail] .rh{border-bottom:1px solid var(--rule);display:flex}
[data-skin=lone-trail] .tag{display:inline-flex;font-size:9.5px}
[data-skin=lone-trail] .punch{display:block;border:1px solid var(--rule)}
`;

const a = scan(current);
const b = scan(stale);
console.log(`current bundle: ${a.length === 0 ? 'PASS (correct)' : 'FAIL (false negative: ' + a.map((p) => p[1]).join(',') + ')'}`);
console.log(`stale bundle:   ${b.length === 4 ? 'FAIL as intended (all 4 rules caught)' : 'NOT CAUGHT — check is blind to ' + (4 - b.length) + ' rule(s)'}`);
process.exit(a.length === 0 && b.length === 4 ? 0 : 1);
