import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_OCR_UPLOAD_BYTES, isStaleTemporaryBlob, signObjectReference,
  validateTemporaryBlobMetadata, validateTemporaryBlobUrl, verifyObjectReference
} from '../utils/ocrTransport.js';

const STORE_ID = 'store_abc123';
const URL = `https://${STORE_ID}.private.blob.vercel-storage.com/ocr-temp/user-a/123e4567-e89b-12d3-a456-426614174000.jpg`;
const SECRET = 'test-only-reference-secret';

test('accepts only the configured private Blob host and OCR prefix', () => {
  assert.equal(validateTemporaryBlobUrl(URL, STORE_ID), URL);
  assert.equal(validateTemporaryBlobUrl(URL, STORE_ID, 'user-a'), URL);
  assert.throws(() => validateTemporaryBlobUrl(URL, STORE_ID, 'user-b'));
  assert.throws(() => validateTemporaryBlobUrl('https://evil.example/ocr-temp/file.jpg', STORE_ID));
  assert.throws(() => validateTemporaryBlobUrl(`https://${STORE_ID}.private.blob.vercel-storage.com/other/file.jpg`, STORE_ID));
  assert.throws(() => validateTemporaryBlobUrl(`${URL}?token=leak`, STORE_ID));
});

test('signed object references are user-bound, expiring, and tamper evident', () => {
  const now = 1_000_000;
  const reference = signObjectReference({
    url: URL, contentType: 'image/jpeg', size: 1024, userId: 'user-a'
  }, SECRET, now);
  assert.equal(verifyObjectReference(reference, SECRET, 'user-a', now + 1).url, URL);
  assert.throws(() => verifyObjectReference(reference, SECRET, 'user-b', now + 1));
  assert.throws(() => verifyObjectReference(`${reference}x`, SECRET, 'user-a', now + 1));
  assert.throws(() => verifyObjectReference(reference, SECRET, 'user-a', now + (11 * 60 * 1000)));
});

test('rejects empty, unsupported, and greater-than-20-MB objects', () => {
  assert.throws(() => validateTemporaryBlobMetadata({ contentType: 'application/pdf', size: 100 }));
  assert.throws(() => validateTemporaryBlobMetadata({ contentType: 'image/png', size: 0 }));
  assert.throws(() => validateTemporaryBlobMetadata({ contentType: 'image/png', size: MAX_OCR_UPLOAD_BYTES + 1 }), /20 MB/);
  assert.doesNotThrow(() => validateTemporaryBlobMetadata({ contentType: 'image/png', size: MAX_OCR_UPLOAD_BYTES }));
});

test('retention cleanup selects only stale temporary OCR objects', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');
  assert.equal(isStaleTemporaryBlob({ pathname: 'ocr-temp/a.jpg', uploadedAt: '2026-10-05T10:00:00Z' }, now), true);
  assert.equal(isStaleTemporaryBlob({ pathname: 'ocr-temp/b.jpg', uploadedAt: '2026-10-05T11:30:00Z' }, now), false);
  assert.equal(isStaleTemporaryBlob({ pathname: 'documents/a.jpg', uploadedAt: '2026-10-05T10:00:00Z' }, now), false);
});
