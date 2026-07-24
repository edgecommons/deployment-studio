/* Deployment Studio — high-fidelity mock, render engine.
 *
 * Realises decision 1A (REVIEW-UI §4): the fleet tree is the persistent context spine, its
 * selection drives the workspace, Releases/Operations/Registry/Settings are the only global areas,
 * the breadcrumb is always visible, and the workspace tabs appear by level.
 *
 * NOTHING here knows a level name. Levels come from `hierarchy.levels`; a scope's level is simply
 * the part of its id before the slash. Swap the workspace in the context bar to see the same UI
 * render an entirely different vocabulary (region/plant/cell) — this is U2b, fixed by construction.
 *
 * Scope of this pass (agreed): the shell plus the screens the kernel can already serve —
 * Overview, Config, Render, and the Releases gate. Tabs and areas outside that scope are rendered
 * as explicit "not designed yet" states rather than invented content.
 */

const state = { key: 'dallas', data: null, sel: { kind: 'scope', id: null }, tab: 'Overview', notes: false };

const el = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Reviewer annotation — mock chrome, never product copy. The screens state what the system does;
 * *why* it is shaped that way lives here, off by default, and in REVIEW-UI. Keeping design rationale
 * out of the surface is what lets the mock be judged on layout, density and hierarchy. */
const note = (text) => (state.notes ? `<div class="mock-annot">${esc(text)}</div>` : '');

/* ── data helpers — all level-agnostic ───────────────────────────────────────────── */

const levelOf = (scopeId) => String(scopeId).split('/')[0];
const valueOf = (scopeId) => String(scopeId).split('/').slice(1).join('/');
const scopeById = (id) => state.data.scopes.find((s) => s.id === id);
const nodeByKey = (k) => state.data.nodes.find((n) => n.key === k);
const childScopes = (id) => state.data.scopes.filter((s) => s.parent === id);
const nodesDirectlyIn = (id) => state.data.nodes.filter((n) => n.scope === id);

/** The scope chain root→leaf: the single source of derived lineage. */
function chainOf(scopeId) {
  const chain = [];
  let cur = scopeId;
  while (cur) {
    const s = scopeById(cur);
    if (!s) break;
    chain.push(s);
    cur = s.parent;
  }
  return chain.reverse();
}

/** Every scope at or beneath `id`. */
function subtreeScopes(id) {
  const out = [];
  const walk = (sid) => { out.push(sid); childScopes(sid).forEach((c) => walk(c.id)); };
  walk(id);
  return out;
}

const nodesUnder = (id) => {
  const ids = new Set(subtreeScopes(id));
  return state.data.nodes.filter((n) => ids.has(n.scope));
};

/** Selection → the scope it lives at (a node resolves to its own scope). */
function selScopeId() {
  if (state.sel.kind === 'node') return nodeByKey(state.sel.id).scope;
  return state.sel.id;
}

/* ── which tabs exist for this selection (REVIEW-UI §4 "tabs by level") ──────────── */

function tabsFor(sel) {
  // Overview / Config / Render / History exist at every level.
  // Components and Topology exist at a node, or at a scope that directly contains nodes
  // (aggregated) — expressed structurally, never by level name.
  const hasNodes = sel.kind === 'node' || nodesDirectlyIn(sel.id).length > 0;
  const tabs = ['Overview'];
  if (hasNodes) tabs.push('Components');
  tabs.push('Config');
  if (hasNodes) tabs.push('Topology');
  tabs.push('Render', 'History');
  return tabs;
}

const GLOBAL_AREAS = [
  { id: 'Releases', note: 'history + pending gates' },
  { id: 'Operations', note: 'drift · rollouts · evidence' },
  { id: 'Registry', note: 'component catalog' },
  { id: 'Settings', note: 'storage · profiles · approvers' },
];

/* ── context bar ─────────────────────────────────────────────────────────────────── */

function renderContextBar() {
  const sw = el('workspace-switch');
  sw.innerHTML = Object.keys(window.MOCK_DATA)
    .map((k) => `<option value="${k}"${k === state.key ? ' selected' : ''}>${esc(window.MOCK_DATA[k].workspace)}</option>`)
    .join('');

  const d = state.data.draft;
  el('draft-chip').innerHTML = d
    ? `<span class="mock-chip mock-chip--draft" title="The branch this workspace is editing">draft <code>${esc(d.branch)}</code> · ${d.changed} files</span>`
    : `<span class="mock-chip" title="No draft branch — the workspace is showing committed state">no draft · reading <code>main</code></span>`;

  // Evidence provenance is global and always visible; a degraded state is designed, not promised.
  const e = state.data.evidence;
  el('evidence-chip').innerHTML = e.degraded
    ? `<span class="mock-chip mock-chip--degraded" title="No evidence source is configured; delivery cannot be adjudicated">evidence: none — delivery unverified</span>`
    : `<span class="mock-chip mock-chip--evidence">evidence: ${esc(e.mode)} · ${esc(e.age)} old · ${esc(e.source)}</span>`;
}

/* ── the spine ───────────────────────────────────────────────────────────────────── */

function renderTree() {
  const rows = [];
  const walk = (scope, depth) => {
    const nodes = nodesDirectlyIn(scope.id);
    const under = nodesUnder(scope.id).length;
    const selected = state.sel.kind === 'scope' && state.sel.id === scope.id;
    rows.push(`
      <button class="mock-tree__row" role="treeitem" aria-selected="${selected}"
              style="padding-left:${0.5 + depth * 0.85}rem" data-kind="scope" data-id="${esc(scope.id)}">
        <span class="mock-level">${esc(levelOf(scope.id))}</span>
        <span class="mock-tree__label">${esc(valueOf(scope.id))}</span>
        <span class="mock-tree__count" title="${under} node(s) beneath">${under}</span>
      </button>`);
    childScopes(scope.id).forEach((c) => walk(c, depth + 1));
    nodes.forEach((n) => {
      const nsel = state.sel.kind === 'node' && state.sel.id === n.key;
      rows.push(`
        <button class="mock-tree__row mock-tree__row--node" role="treeitem" aria-selected="${nsel}"
                style="padding-left:${0.5 + (depth + 1) * 0.85}rem" data-kind="node" data-id="${esc(n.key)}">
          <span class="mock-level">${esc(state.data.hierarchy.levels[state.data.hierarchy.levels.length - 1])}</span>
          <span class="mock-tree__label">${esc(n.key)}</span>
          <span class="mock-tree__count">${n.components.length}</span>
        </button>`);
    });
  };
  state.data.scopes.filter((s) => !s.parent).forEach((r) => walk(r, 0));
  el('tree').innerHTML = rows.join('');

  el('global-nav').innerHTML = GLOBAL_AREAS.map((g) => `
    <li><button data-kind="global" data-id="${g.id}" aria-current="${state.sel.kind === 'global' && state.sel.id === g.id}">
      ${g.id} <small>${esc(g.note)}</small>
    </button></li>`).join('');
}

/* ── breadcrumb + header + tabs ──────────────────────────────────────────────────── */

function renderBreadcrumb() {
  const parts = [`<button data-kind="root">${esc(state.data.workspace)}</button>`];
  if (state.sel.kind === 'global') {
    parts.push(`<span class="sep">/</span><span aria-current="page">${esc(state.sel.id)}</span>`);
  } else {
    const scopeId = selScopeId();
    chainOf(scopeId).forEach((s) => {
      const isLast = state.sel.kind === 'scope' && s.id === scopeId;
      parts.push('<span class="sep">/</span>');
      parts.push(isLast
        ? `<span aria-current="page">${esc(valueOf(s.id))}</span>`
        : `<button data-kind="scope" data-id="${esc(s.id)}">${esc(valueOf(s.id))}</button>`);
    });
    if (state.sel.kind === 'node') {
      parts.push(`<span class="sep">/</span><span aria-current="page">${esc(state.sel.id)}</span>`);
    }
  }
  el('breadcrumb').innerHTML = parts.join(' ');
}

function renderHeader() {
  const h = el('selection-header');
  if (state.sel.kind === 'global') {
    h.innerHTML = `<h1>${esc(state.sel.id)}</h1><span class="mock-sub">global area</span>`;
    return;
  }
  if (state.sel.kind === 'node') {
    const n = nodeByKey(state.sel.id);
    const deviceLevel = state.data.hierarchy.levels[state.data.hierarchy.levels.length - 1];
    h.innerHTML = `<h1>${esc(n.key)}</h1>
      <span class="mock-level">${esc(deviceLevel)}</span>
      <span class="mock-sub">${n.components.length} components · attached to <code>${esc(n.scope)}</code></span>`;
    return;
  }
  const s = scopeById(state.sel.id);
  h.innerHTML = `<h1>${esc(valueOf(s.id))}</h1>
    <span class="mock-level">${esc(levelOf(s.id))}</span>
    <span class="mock-sub">${nodesUnder(s.id).length} nodes · ${subtreeScopes(s.id).length - 1} child scopes</span>`;
}

function renderTabs() {
  if (state.sel.kind === 'global') { el('tabs').innerHTML = ''; return; }
  const tabs = tabsFor(state.sel);
  if (!tabs.includes(state.tab)) state.tab = 'Overview';
  el('tabs').innerHTML = tabs.map((t) =>
    `<button role="tab" data-tab="${t}" aria-selected="${t === state.tab}">${t}</button>`).join('');
}

/* ── panels ──────────────────────────────────────────────────────────────────────── */

/* Mock chrome. A reviewer must be able to tell an undesigned area from a designed-empty one, so
 * these are marked — but the marker is chrome, not product copy, and carries no product voice. */
const notDesigned = (what, why) => `
  <div class="mock-empty">
    <strong>${esc(what)}</strong>
    Not designed in this pass.
  </div>
  ${note(why)}`;

function panelOverview() {
  const isNode = state.sel.kind === 'node';
  const nodes = isNode ? [nodeByKey(state.sel.id)] : nodesUnder(state.sel.id);
  const comps = nodes.reduce((a, n) => a + n.components.length, 0);
  const scopeId = selScopeId();
  const chain = chainOf(scopeId);
  const unpinned = nodes.flatMap((n) => n.components).filter((c) => !c.artifact.version).length;

  return `
    <h2>Aggregates</h2>
    <div class="mock-cards">
      <div class="mock-card"><div class="mock-card__label">Nodes</div><div class="mock-card__value">${nodes.length}</div>
        <div class="mock-card__note">at or beneath this selection</div></div>
      <div class="mock-card"><div class="mock-card__label">Component assignments</div><div class="mock-card__value">${comps}</div>
        <div class="mock-card__note">config leaves that would be merged</div></div>
      <div class="mock-card"><div class="mock-card__label">Layer chain depth</div><div class="mock-card__value">${chain.length}</div>
        <div class="mock-card__note">${chain.map((c) => levelOf(c.id)).join(' → ')} → leaf</div></div>
      <div class="mock-card"><div class="mock-card__label">Unpinned artifacts</div>
        <div class="mock-card__value">${unpinned}</div>
        <div class="mock-card__note">${unpinned ? 'source-form; blocks protected promotion' : 'all pinned to version + digest'}</div></div>
    </div>

    <h2>Streams</h2>
    ${note('REVIEW #2 — config and artifact are promoted and rolled back independently, so every surface shows them as a pair and never fuses them into a single status.')}
    <div class="mock-streams">
      <div class="mock-stream mock-stream--config">
        <div class="mock-stream__head"><span class="mock-pill mock-pill--config">config</span>
          <strong>${esc(state.data.releases[0].tag)}</strong></div>
        <div class="mock-stream__body">
          <dl class="mock-kv">
            <dt>State</dt><dd>${esc(state.data.releases[0].state)}</dd>
            <dt>Delivery</dt><dd>${esc([...new Set(nodes.flatMap((n) => n.components.map((c) => c.configSource)))].join(', ') || '—')}</dd>
            <dt>Restart impact</dt><dd>${nodes.flatMap((n) => n.components).every((c) => c.hotReloads) ? 'hot-reload (no restart)' : 'mixed'}</dd>
          </dl>
        </div>
      </div>
      <div class="mock-stream mock-stream--artifact">
        <div class="mock-stream__head"><span class="mock-pill mock-pill--artifact">artifact</span>
          <strong>${esc(state.data.releases[1].tag)}</strong></div>
        <div class="mock-stream__body">
          <dl class="mock-kv">
            <dt>State</dt><dd>${esc(state.data.releases[1].state)}</dd>
            <dt>Pinned</dt><dd>${comps - unpinned} of ${comps}</dd>
            <dt>Promotion</dt><dd>${unpinned ? '<span class="mock-pill mock-pill--warn">blocked — devMode</span>' : '<span class="mock-pill mock-pill--ok">eligible</span>'}</dd>
          </dl>
        </div>
      </div>
    </div>

    <h2>Bindings in effect</h2>
    <div class="mock-tablewrap"><table class="mock-table">
      <thead><tr><th>Profile</th><th>Family</th><th>Environment</th><th>Bindings file</th><th>Rendered files</th></tr></thead>
      <tbody>${state.data.profiles.map((p) => `
        <tr><td>${esc(p.name)}</td><td><span class="mock-pill">${esc(p.family)}</span></td>
            <td>${esc(p.environment)}</td><td><code>${esc(p.bindings)}</code></td><td>${p.files}</td></tr>`).join('')}
      </tbody></table></div>`;
}

function panelConfig() {
  const scopeId = selScopeId();
  const chain = chainOf(scopeId);
  const isNode = state.sel.kind === 'node';
  const nodes = isNode ? [nodeByKey(state.sel.id)] : nodesUnder(scopeId);
  const comps = nodes.reduce((a, n) => a + n.components.length, 0);
  // The layer authored at the selection's own scope (absent is a real, displayable state).
  const ownLayer = (scopeById(scopeId) || {}).layer;

  const chainRows = chain.map((s, i) => `
    <div class="mock-chain__row ${s.layer ? '' : 'mock-chain__row--empty'}">
      <span class="mock-chain__idx">${i + 1}</span>
      <span><span class="mock-level">${esc(levelOf(s.id))}</span> ${esc(valueOf(s.id))}</span>
      <code>${esc(s.layer || 'no layer authored at this scope')}</code>
      <span class="mock-pill">${s.keys} keys</span>
    </div>`).join('');

  const leafRows = isNode ? nodeByKey(state.sel.id).components.map((c, i) => `
    <div class="mock-chain__row mock-chain__row--leaf">
      <span class="mock-chain__idx">${chain.length + i + 1}</span>
      <span>${esc(c.name)}</span>
      <code>${esc(c.layer)}</code>
      <span class="mock-pill mock-pill--config">${esc(c.configSource)}</span>
    </div>`).join('') : '';

  return `
    <h2>Merge order</h2>
    <p class="mock-sub" style="margin-top:-0.25rem">Applied in order. Later entries win; the component leaf wins last.</p>
    ${note('S-7 — lineage is derived from the node’s placement, never enumerated per component, so this list is computed rather than authored.')}
    <div class="mock-chain">${chainRows}${leafRows}</div>

    <h2>Layer at this scope</h2>
    <div class="mock-writes">
      <span><strong>File</strong> <code>${esc(ownLayer || '— none authored')}</code></span>
      <span><strong>Applies to</strong> ${nodes.length} node(s) · ${comps} component(s)</span>
      <span><strong>Restart impact</strong> ${nodes.flatMap((n) => n.components).every((c) => c.hotReloads) ? 'none — hot-reload' : 'mixed'}</span>
    </div>
    ${note('This is the read-only face of the declared-write honesty layer. In the editor it becomes a pre-commit statement — target file, scope, blast radius — so the Studio cannot become a second, hidden configuration system. The editor itself is the write-path cut.')}

    <h2>Derived</h2>
    <p class="mock-sub" style="margin-top:-0.25rem">Computed from placement and merged into every component here.</p>
    <dl class="mock-kv">
      <dt>hierarchy.levels</dt><dd><code>${esc(state.data.hierarchy.levels.join(', '))}</code></dd>
      ${chain.map((s) => `<dt>identity.${esc(levelOf(s.id))}</dt><dd><code>${esc(valueOf(s.id))}</code></dd>`).join('')}
    </dl>
    ${note('S-4 — these two keys are rejected in authored layers, so they are shown here as computed values rather than editable fields; attempting to author them is a validation error at save. The Dallas extraction found them hand-copied into three catalogs, which is the drift the rule removes.')}`;
}

function panelRender() {
  const scopeId = selScopeId();
  const isNode = state.sel.kind === 'node';
  const nodes = isNode ? [nodeByKey(state.sel.id)] : nodesUnder(scopeId);
  const rows = nodes.flatMap((n) => n.components.map((c) => `
    <tr>
      <td>${esc(n.key)}</td>
      <td>${esc(c.name)}</td>
      <td><span class="mock-pill mock-pill--config">config</span></td>
      <td>${c.hotReloads ? 'no' : 'yes'}</td>
      <td>rendered effective config → <code>${esc(c.configSource)}</code></td>
    </tr>
    <tr>
      <td>${esc(n.key)}</td>
      <td>${esc(c.name)}</td>
      <td><span class="mock-pill mock-pill--artifact">artifact</span></td>
      <td>yes</td>
      <td>${c.artifact.version
        ? `pinned <code>${esc(c.artifact.version)}</code>`
        : `<span class="mock-pill mock-pill--warn">source-form</span> <code>${esc(c.artifact.source)}</code>`}</td>
    </tr>`)).join('');

  return `
    <h2>Plan for this selection</h2>
    <p class="mock-sub" style="margin-top:-0.25rem">Restart impact follows the config source.</p>
    ${note('Hot-reload is a property of the config source, not of the platform — the plan classifies restart impact from the source alone.')}
    <div class="mock-tablewrap"><table class="mock-table">
      <thead><tr><th>Node</th><th>Component</th><th>Stream</th><th>Restarts</th><th>Consequence</th></tr></thead>
      <tbody>${rows}</tbody></table></div>

    <h2>Targets</h2>
    <div class="mock-cards">${state.data.profiles.map((p) => `
      <div class="mock-card">
        <div class="mock-card__label">${esc(p.family)}</div>
        <div class="mock-card__value">${p.files}</div>
        <div class="mock-card__note">files from profile <code>${esc(p.name)}</code> · env ${esc(p.environment)}</div>
      </div>`).join('')}</div>`;
}

/** The gate: two stream cards, the evidence envelope, and approvals rendered from CODEOWNERS. */
function panelReleases() {
  const co = state.data.codeowners;

  const card = (r) => {
    const pending = r.reviewers.filter((x) => !r.approved.includes(x));
    const stateP = r.state === 'ready' ? 'mock-pill--ok' : r.state === 'blocked' ? 'mock-pill--danger' : 'mock-pill--warn';
    return `
      <div class="mock-stream mock-stream--${r.stream}">
        <div class="mock-stream__head">
          <span class="mock-pill mock-pill--${r.stream}">${r.stream}</span>
          <strong>${esc(r.tag)}</strong>
          <span class="mock-pill ${stateP}" style="margin-left:auto">${esc(r.state)}</span>
        </div>
        <div class="mock-stream__body">
          <dl class="mock-kv">
            <dt>Definition commit</dt><dd><code>${esc(r.commit)}</code></dd>
            <dt>Files</dt><dd>${r.files}</dd>
            <dt>Release hash</dt><dd><code>${esc(r.hash.slice(0, 26))}…</code></dd>
            <dt>devMode</dt><dd>${r.devMode ? '<span class="mock-pill mock-pill--warn">yes</span>' : 'no'}</dd>
            <dt>Approvals</dt><dd>${co
              ? (r.reviewers.length
                  ? `${r.approved.length}/${r.reviewers.length}` +
                    (r.approved.length ? ` · approved ${r.approved.map((a) => `<span class="mock-pill mock-pill--ok">${esc(a)}</span>`).join(' ')}` : '') +
                    (pending.length ? ` · pending ${pending.map((a) => `<span class="mock-pill">${esc(a)}</span>`).join(' ')}` : '')
                  : 'no owning rule')
              : '<span class="mock-pill mock-pill--warn">default branch protection</span>'}</dd>
          </dl>
          ${r.blockedReason ? `<div class="mock-note mock-note--warn">${esc(r.blockedReason)}</div>` : ''}
        </div>
      </div>`;
  };

  const ev = state.data.evidenceBundle;
  return `
    <h2>Pending gate</h2>
    <p class="mock-sub" style="margin-top:-0.25rem">Each stream promotes and rolls back on its own.</p>
    ${note('REVIEW #2 — the release lock correlates the two streams without fusing them; promoting one never moves the other, and each keeps its own rollback target.')}
    <div class="mock-streams">${state.data.releases.map(card).join('')}</div>

    <h2>Approvals</h2>
    ${co
      ? `<p class="mock-sub" style="margin-top:-0.25rem">Required reviewers, from <code>${esc(co.path)}</code>.</p>
         ${note('REVIEW #10 — approval is a rendering of Git-host review state. The Studio surfaces the rule that already governs each file and holds no parallel approval store.')}
         <div class="mock-tablewrap"><table class="mock-table">
           <thead><tr><th>Rule</th><th>Required reviewers</th></tr></thead>
           <tbody>${co.rules.map((r) => `<tr><td><code>${esc(r.pattern)}</code></td>
             <td>${r.owners.map((o) => `<span class="mock-pill">${esc(o)}</span>`).join(' ')}</td></tr>`).join('')}
           </tbody></table></div>`
      : `<div class="mock-note mock-note--warn">This repository defines no <code>CODEOWNERS</code>. Changes to every file fall
           to the default branch-protection review.</div>
         ${note('A degraded state is designed, not promised: an absent CODEOWNERS is shown as the review it falls back to, never as "no approval required".')}`}

    <h2>Evidence bundle</h2>
    <dl class="mock-kv">
      <dt>Schema validation</dt><dd>${esc(ev.schemaValidation)}</dd>
      <dt>Semantic rules</dt><dd>${esc(ev.semanticRules)}</dd>
      <dt>Render determinism</dt><dd>${esc(ev.renderDeterminism)}</dd>
      <dt>Warnings</dt><dd>${ev.warnings.length ? ev.warnings.map(esc).join('<br>') : 'none'}</dd>
    </dl>`;
}

function renderPanel() {
  const p = el('panel');
  if (state.sel.kind === 'global') {
    if (state.sel.id === 'Releases') { p.innerHTML = panelReleases(); return; }
    p.innerHTML = notDesigned(state.sel.id,
      'Agreed scope for this pass was the shell plus the screens the kernel can already serve: Overview, Config, Render and the Releases gate.');
    return;
  }
  switch (state.tab) {
    case 'Overview': p.innerHTML = panelOverview(); break;
    case 'Config': p.innerHTML = panelConfig(); break;
    case 'Render': p.innerHTML = panelRender(); break;
    case 'Components': p.innerHTML = notDesigned('Components',
      'Node-anchored component editor (decision 3A) — next pass, together with the write path.'); break;
    case 'Topology': p.innerHTML = notDesigned('Topology',
      'The derived, read-only topology graph (REVIEW #4) — next pass.'); break;
    case 'History': p.innerHTML = notDesigned('History',
      'Git history for this selection — needs a log port the kernel does not expose yet.'); break;
    default: p.innerHTML = '';
  }
}

/* ── wiring ──────────────────────────────────────────────────────────────────────── */

function render() {
  renderContextBar();
  renderTree();
  renderBreadcrumb();
  renderHeader();
  renderTabs();
  renderPanel();
}

function load(key) {
  state.key = key;
  state.data = window.MOCK_DATA[key];
  state.sel = { kind: 'scope', id: state.data.scopes.find((s) => !s.parent).id };
  state.tab = 'Overview';
  render();
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tab) { state.tab = b.dataset.tab; render(); return; }
  if (b.dataset.kind === 'root') { load(state.key); return; }
  if (b.dataset.kind === 'global') { state.sel = { kind: 'global', id: b.dataset.id }; render(); return; }
  if (b.dataset.kind === 'scope' || b.dataset.kind === 'node') {
    state.sel = { kind: b.dataset.kind, id: b.dataset.id };
    render();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'workspace-switch') load(e.target.value);
  if (e.target.id === 'notes-toggle') { state.notes = e.target.checked; renderPanel(); }
});

load('dallas');
