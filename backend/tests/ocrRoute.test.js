import test from 'node:test';
import assert from 'node:assert/strict';
import { signObjectReference } from '../utils/ocrTransport.js';

process.env.JWT_SECRET ||= 'test-only-jwt-secret';
process.env.RAPIDOCR_SERVICE_URL = 'http://ocr.internal';
const { ocrServiceRequest } = await import('../routes/ocr.js');

const file = {
  buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg', originalname: 'test.jpg'
};

test('OCR unavailable returns a manual-entry-safe gateway error', async () => {
  const result = await ocrServiceRequest(
    { expectedType: 'cnic', file, userId: 'user-a' },
    { fetchImpl: async () => { throw new TypeError('network unavailable'); } }
  );
  assert.equal(result.status, 502);
  assert.match(result.payload.error, /continue by entering/i);
});

test('OCR timeout returns a manual-entry-safe timeout error', async () => {
  const oldTimeout = process.env.RAPIDOCR_REQUEST_TIMEOUT_MS;
  process.env.RAPIDOCR_REQUEST_TIMEOUT_MS = '1';
  try {
    const result = await ocrServiceRequest(
      { expectedType: 'cnic', file, userId: 'user-a' },
      { fetchImpl: async (_url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }) }
    );
    assert.equal(result.status, 504);
    assert.match(result.payload.error, /manually/i);
  } finally {
    if (oldTimeout === undefined) delete process.env.RAPIDOCR_REQUEST_TIMEOUT_MS;
    else process.env.RAPIDOCR_REQUEST_TIMEOUT_MS = oldTimeout;
  }
});

test('temporary object cleanup is attempted after a successful OCR response', async () => {
  process.env.BLOB_STORE_ID = 'store_abc123';
  process.env.OCR_OBJECT_REFERENCE_SECRET = 'reference-test-secret';
  const url = 'https://store_abc123.private.blob.vercel-storage.com/ocr-temp/user-a/random.jpg';
  const reference = signObjectReference({
    url, contentType: 'image/jpeg', size: 10, userId: 'user-a'
  }, process.env.OCR_OBJECT_REFERENCE_SECRET);
  const deleted = [];
  const result = await ocrServiceRequest(
    { expectedType: 'cnic', objectReference: reference, userId: 'user-a' },
    {
      fetchImpl: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
      deleteImpl: async target => { deleted.push(target); }
    }
  );
  assert.equal(result.status, 200);
  assert.deepEqual(deleted, [url]);
});

test('cleanup failure does not discard a successful OCR response', async () => {
  process.env.BLOB_STORE_ID = 'store_abc123';
  process.env.OCR_OBJECT_REFERENCE_SECRET = 'reference-test-secret';
  const url = 'https://store_abc123.private.blob.vercel-storage.com/ocr-temp/user-a/random.jpg';
  const reference = signObjectReference({
    url, contentType: 'image/jpeg', size: 10, userId: 'user-a'
  }, process.env.OCR_OBJECT_REFERENCE_SECRET);
  const result = await ocrServiceRequest(
    { expectedType: 'cnic', objectReference: reference, userId: 'user-a' },
    {
      fetchImpl: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
      deleteImpl: async () => { throw new Error('delete failed'); }
    }
  );
  assert.equal(result.status, 200);
  assert.equal(result.payload.success, true);
});
