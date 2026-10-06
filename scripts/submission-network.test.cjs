const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

test('all generated game plans retain their original Lucide icons', () => {
  function load(file) {
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    const context = { exports: {}, require: (id) => load(id.replace('@/', '') + '.ts') };
    vm.runInNewContext(code, context); return context.exports;
  }
  const { generateAttemptPlan } = load('lib/game/engine.ts');
  const source = fs.readFileSync('components/game/Level3TechMatch.tsx', 'utf8');
  const registry = source.match(/const TECH_ICONS[^=]*=\s*\{([^}]+)\}/)[1].split(',').map((s) => s.trim());
  for (let seed = 0; seed < 1024; seed++) {
    for (const pair of generateAttemptPlan(seed).level3.techPairs) assert.ok(registry.includes(pair.left), pair.left);
  }
  assert.doesNotMatch(source, /import \* as Lucide/);
});

// Actual handlers with delayed transport: duplicate calls before React renders
// a disabled button, failure cleanup, and subsequent retry.
function handler(file, name, context) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let node;
  function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === name) node = n; ts.forEachChild(n, visit); }
  visit(ast); assert.ok(node);
  const compiled = ts.transpileModule(node.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(compiled + `\n${name}`, context);
}
for (const [file, name, refName] of [
  ['app/admin/page.tsx', 'submit', 'loginPending'],
  ['app/play/[id]/page.tsx', 'submitLevel', 'submissionPending'],
  ['app/play/[id]/page.tsx', 'begin', 'startPending'],
  ['app/play/[id]/page.tsx', 'load', null],
  ['components/game/RegistrationForm.tsx', 'onSubmit', 'submissionPending'],
  ['app/admin/dashboard/page.tsx', 'save', 'savePending'],
  ['app/admin/dashboard/page.tsx', 'action', null],
]) {
  test(`${name}: delayed/failed transport suppresses duplicates and unlocks`, async () => {
    let calls = 0, fail;
    const context = {
      fetch: () => { calls++; return new Promise((_, reject) => { fail = reject; }); },
      [refName || 'unused']: { current: false }, pendingActions: { current: new Set() }, pendingLoads: { current: new Set() },
      view: { currentLevel: 1 }, attemptId: 'fixture-attempt', pwd: 'fixture',
      draft: {}, validate: () => null, validateClient: () => ({}),
      FormData: class { get(name) { return name; } },
      setErrors() {}, setSubmitting() {}, setLoading() {}, setSaving() {}, setError() {},
      push() {}, toastPush() {}, audio: { play() {} },
    };
    const submit = handler(file, name, context);
    const args = name === 'submit' ? [{ preventDefault() {} }] : name === 'action' ? ['fixture-attempt', 'mark_claimed'] : [{}];
    const first = submit(...args);
    await submit(...args); assert.equal(calls, 1);
    fail(Error('offline')); await first;
    const retry = submit(...args); assert.equal(calls, 2);
    fail(Error('offline')); await retry;
  });
}
