import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hertzbeat-docs-contract-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const relative of [
    'home/docs',
    'home/i18n/zh-cn/docusaurus-plugin-content-docs/current',
    'home/sidebars.json',
    'home/scripts/verify-roadmap-docs.mjs'
  ]) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.cpSync(path.join(repoRoot, relative), target, {recursive: true});
  }
  return root;
}

function verify(root) {
  return spawnSync(process.execPath, [path.join(root, 'home/scripts/verify-roadmap-docs.mjs')], {
    cwd: root,
    encoding: 'utf8'
  });
}

test('the public navigation contract passes without a local progress tracker', t => {
  const root = fixture(t);
  assert.equal(fs.existsSync(path.join(root, 'progress.md')), false);
  const result = verify(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /24 navigation IDs in both locales/);
});

test('a missing current translation fails', t => {
  const root = fixture(t);
  fs.unlinkSync(path.join(root, 'home/i18n/zh-cn/docusaurus-plugin-content-docs/current/help/ollama.md'));
  const result = verify(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing current documentation:.*help\/ollama\.md/);
});

test('missing or duplicate required navigation fails', t => {
  const root = fixture(t);
  const file = path.join(root, 'home/sidebars.json');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original.replace('"help/ollama"', '"help/lmstudio"'));
  const result = verify(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /include help\/ollama exactly once/);
  assert.match(result.stderr, /include help\/lmstudio exactly once/);
});

test('the roadmap remains an explicit navigation category', t => {
  const root = fixture(t);
  const file = path.join(root, 'home/sidebars.json');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('"Roadmap"', '"Other plans"'));
  const result = verify(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /expose the Roadmap category/);
});

test('a proposal cannot silently change its declared availability', t => {
  const root = fixture(t);
  const file = path.join(root, 'home/docs/roadmap/future-security.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('roadmap_status: proposed', 'roadmap_status: implemented'));
  const result = verify(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must declare roadmap_status: proposed/);
});

test('a broken relative documentation link fails', t => {
  const root = fixture(t);
  fs.appendFileSync(path.join(root, 'home/docs/help/lmstudio.md'), '\n[Missing guide](./does-not-exist.md)\n');
  const result = verify(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing relative document: \.\/does-not-exist\.md/);
});

test('a changed document id cannot detach the navigation target', t => {
  const root = fixture(t);
  const file = path.join(root, 'home/docs/start/native-collector.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('id: native-collector', 'id: renamed-collector'));
  const result = verify(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unexpected document id/);
});
