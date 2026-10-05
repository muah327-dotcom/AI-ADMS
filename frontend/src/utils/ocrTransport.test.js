import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRejectRapidOcrUpload, shouldUseLocalOcrFallback } from './ocrTransport.js';

test('wrong, corrupt, and oversized documents remain rejected', () => {
  for (const status of [400, 413, 422]) assert.equal(shouldRejectRapidOcrUpload(status), true);
});

test('upload, availability, and timeout failures allow the existing local/manual flow', () => {
  for (const status of [undefined, 502, 503, 504]) assert.equal(shouldUseLocalOcrFallback(status), true);
});
