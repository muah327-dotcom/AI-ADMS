import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildApiUrl, DEFAULT_API_URL } from '../config/api.js';
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

test('OCR endpoints resolve against the configured backend API without duplicating api', () => {
  const backendApi = 'https://backend-preview.example.com/api';
  const frontendOrigin = 'https://frontend-preview.example.com';
  const endpoints = ['temporary-upload', 'temporary-reference', 'extract'];

  for (const endpoint of endpoints) {
    const resolved = buildApiUrl(backendApi, `ocr/${endpoint}`);
    assert.equal(resolved, `${backendApi}/ocr/${endpoint}`);
    assert.notEqual(resolved, `${frontendOrigin}/api/ocr/${endpoint}`);
    assert.doesNotMatch(resolved, /\/api\/api\/ocr\//);
  }
});

test('API URL construction remains functional with local defaults and api-prefixed paths', () => {
  assert.equal(
    buildApiUrl(undefined, '/ocr/temporary-upload'),
    'http://localhost:3001/api/ocr/temporary-upload'
  );
  assert.equal(
    buildApiUrl(DEFAULT_API_URL, '/api/ocr/extract'),
    'http://localhost:3001/api/ocr/extract'
  );
});
