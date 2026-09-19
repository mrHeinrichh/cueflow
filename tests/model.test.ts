import assert from 'node:assert/strict';
import test from 'node:test';
import { defaults, importScripts, normalizeSettings, timeLabel, validScripts, words } from '../src/model.ts';

const script = { id: 'first', title: 'A rehearsal', content: 'Hello, world.\n\nTake a breath.', updated: 1_700_000_000_000 };

test('text import preserves Unicode, line breaks, and a useful filename title', () => {
  const text = 'Kumusta 👋\n\nこんにちは\nOne more take.';
  const [imported] = importScripts(text, 'A creative take.MD');
  assert.equal(imported.title, 'A creative take');
  assert.equal(imported.content, text);
  assert.ok(imported.id);
  assert.ok(Number.isFinite(imported.updated));
});

test('backup round-trip preserves scripts while assigning fresh identifiers', () => {
  const original = [script, { ...script, id: 'second', title: 'Next', content: 'Two.' }];
  const restored = importScripts(JSON.stringify({ version: 1, scripts: original }), 'cueflow-library.json');
  assert.deepEqual(restored.map(({ title, content }) => ({ title, content })), original.map(({ title, content }) => ({ title, content })));
  assert.equal(new Set(restored.map(s => s.id)).size, 2);
  assert.ok(restored.every(s => !original.some(o => o.id === s.id)));
  assert.deepEqual(original.map(s => s.id), ['first', 'second']);
});

test('raw script arrays also import as backups', () => {
  assert.equal(importScripts(JSON.stringify([script]), 'backup.JSON')[0].content, script.content);
});

test('malformed or unrelated JSON cannot replace a valid library', () => {
  for (const value of ['{broken', 'null', '42', '{}', '[]', '{"scripts":[{"title":"Oops"}]}']) {
    assert.throws(() => importScripts(value, 'broken.json'));
  }
  assert.ok(validScripts([script]));
});

test('library validation rejects duplicate IDs, missing fields, and non-finite timestamps', () => {
  for (const invalid of [null, {}, [], [script, script], [{ ...script, id: '' }], [{ ...script, content: 12 }], [{ ...script, updated: Infinity }], [{ ...script, updated: 'today' }]]) {
    assert.equal(validScripts(invalid), false);
  }
  assert.equal(validScripts([{ ...script, title: '', content: '' }]), true);
});

test('script and library limits reject oversized data but accept their boundaries', () => {
  assert.ok(validScripts([{ ...script, content: 'a'.repeat(500_000) }]));
  assert.equal(validScripts([{ ...script, content: 'a'.repeat(500_001) }]), false);
  const maxLibrary = Array.from({ length: 500 }, (_, i) => ({ ...script, id: `script-${i}` }));
  assert.ok(validScripts(maxLibrary));
  assert.equal(validScripts([...maxLibrary, { ...script, id: 'one-too-many' }]), false);
  assert.throws(() => importScripts('a'.repeat(500_001), 'large.txt'), /500,000/);
  assert.throws(() => importScripts('text', 'script.docx'), /\.txt/);
});

test('a valid saved library larger than 2 MB can be restored from its backup', () => {
  const original = Array.from({ length: 5 }, (_, i) => ({ ...script, id: `long-${i}`, content: 'a'.repeat(450_000) }));
  assert.ok(validScripts(original));
  const restored = importScripts(JSON.stringify({ version: 1, scripts: original }), 'cueflow-library.json');
  assert.equal(restored.length, original.length);
  assert.equal(restored[4].content, original[4].content);
});

test('corrupt settings fall back to a usable display', () => {
  assert.deepEqual(normalizeSettings(null), defaults);
  assert.deepEqual(normalizeSettings({ speed: NaN, fontSize: 'huge', lineHeight: Infinity, width: undefined, mirror: 1, guide: 'false', countdown: NaN, theme: 'neon' }), defaults);
});

test('out-of-range settings are clamped and legitimate settings survive', () => {
  assert.deepEqual(normalizeSettings({ speed: 900, fontSize: 1, lineHeight: 10, width: -1, mirror: true, guide: false, countdown: 99, theme: 'light' }), { speed: 120, fontSize: 24, lineHeight: 2.2, width: 45, mirror: true, guide: false, countdown: 10, theme: 'light' });
  const preferences = { ...defaults, speed: 60, fontSize: 52, lineHeight: 1.8, width: 70, countdown: 0, mirror: true };
  assert.deepEqual(normalizeSettings(preferences), preferences);
});

test('word counts and playback time stay readable for empty and multiline scripts', () => {
  assert.equal(words(' \t\n '), 0);
  assert.equal(words('Hello\n\nworld.\tOne more take.'), 5);
  assert.equal(timeLabel(-5), '00:00');
  assert.equal(timeLabel(0), '00:00');
  assert.equal(timeLabel(65.9), '01:05');
  assert.equal(timeLabel(3_600), '60:00');
});
