import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { shouldRejectRapidOcrUpload, shouldUseLocalOcrFallback } from './ocrTransport.js';

test('wrong, corrupt, and oversized documents remain rejected', () => {
  for (const status of [400, 413, 422]) assert.equal(shouldRejectRapidOcrUpload(status), true);
});

test('upload, availability, and timeout failures allow the existing local/manual flow', () => {
  for (const status of [undefined, 502, 503, 504]) assert.equal(shouldUseLocalOcrFallback(status), true);
});

test('admission form does not render internally parsed subject details', async () => {
  const source = await readFile(new URL('../components/Documents/DocumentUpload.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Extracted Subjects \(Auto-Parsed from Document\)/i);
  assert.doesNotMatch(source, /renderSubjects\s*\(/);
});
