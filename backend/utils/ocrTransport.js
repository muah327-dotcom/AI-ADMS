import crypto from 'crypto';

export const MAX_OCR_UPLOAD_BYTES = 20 * 1024 * 1024;
export const OCR_TEMP_PREFIX = 'ocr-temp/';
export const OCR_REFERENCE_TTL_MS = 10 * 60 * 1000;
export const OCR_TEMP_RETENTION_MS = 60 * 60 * 1000;
export const ALLOWED_OCR_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/x-ms-bmp'
]);

const base64url = (value) => Buffer.from(value).toString('base64url');

export const allowedBlobHostname = (storeId) =>
  storeId ? `${storeId}.private.blob.vercel-storage.com`.toLowerCase() : null;

export const validateTemporaryBlobUrl = (rawUrl, storeId, userId = null) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid temporary OCR object reference.');
  }
  const hostname = allowedBlobHostname(storeId);
  if (!hostname || parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== hostname) {
    throw new Error('Temporary OCR object is not in the configured private store.');
  }
  const pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
  const expectedPrefix = userId ? `${OCR_TEMP_PREFIX}${String(userId)}/` : OCR_TEMP_PREFIX;
  if (!pathname.startsWith(expectedPrefix)) {
    throw new Error('Invalid temporary OCR object path.');
  }
  if (parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) {
    throw new Error('Invalid temporary OCR object URL.');
  }
  return parsed.toString();
};

export const validateTemporaryBlobMetadata = (blob) => {
  if (!blob || !ALLOWED_OCR_MIME_TYPES.has(blob.contentType)) {
    throw new Error('Temporary OCR object has an unsupported image type.');
  }
  if (!Number.isFinite(blob.size) || blob.size <= 0 || blob.size > MAX_OCR_UPLOAD_BYTES) {
    throw new Error(blob?.size > MAX_OCR_UPLOAD_BYTES
      ? 'Image exceeds the 20 MB limit.'
      : 'Temporary OCR object is empty or has invalid metadata.');
  }
};

export const signObjectReference = ({ url, contentType, size, userId }, secret, now = Date.now()) => {
  if (!secret) throw new Error('OCR object reference signing is not configured.');
  const payload = base64url(JSON.stringify({
    url, content_type: contentType, size, user_id: String(userId), exp: now + OCR_REFERENCE_TTL_MS
  }));
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

export const verifyObjectReference = (reference, secret, userId, now = Date.now()) => {
  if (!secret || typeof reference !== 'string') throw new Error('Invalid temporary OCR object reference.');
  const [payload, signature, extra] = reference.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid temporary OCR object reference.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { throw new Error('Invalid temporary OCR object reference.'); }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    throw new Error('Invalid temporary OCR object reference.');
  }
  let decoded;
  try { decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch {
    throw new Error('Invalid temporary OCR object reference.');
  }
  if (decoded.user_id !== String(userId) || !Number.isFinite(decoded.exp) || decoded.exp < now) {
    throw new Error('Temporary OCR object reference is expired or unauthorized.');
  }
  validateTemporaryBlobMetadata({ contentType: decoded.content_type, size: decoded.size });
  return decoded;
};

export const isStaleTemporaryBlob = (blob, now = Date.now()) => {
  const uploadedAt = new Date(blob?.uploadedAt || 0).getTime();
  return blob?.pathname?.startsWith(OCR_TEMP_PREFIX) && Number.isFinite(uploadedAt)
    && now - uploadedAt >= OCR_TEMP_RETENTION_MS;
};
