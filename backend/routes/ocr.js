import express from 'express';
import multer from 'multer';
import path from 'path';
import { del, head, list } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { authenticateToken } from '../middleware/auth.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import {
  ALLOWED_OCR_MIME_TYPES, MAX_OCR_UPLOAD_BYTES, OCR_TEMP_PREFIX,
  isStaleTemporaryBlob, signObjectReference, validateTemporaryBlobMetadata,
  validateTemporaryBlobUrl, verifyObjectReference
} from '../utils/ocrTransport.js';

const router = express.Router();

const ALLOWED_OCR_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.jfif', '.bmp']);
const uploadOcrImage = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: MAX_OCR_UPLOAD_BYTES },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_OCR_EXTENSIONS.has(extension) || !ALLOWED_OCR_MIME_TYPES.has(file.mimetype)) {
      return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
    }
    callback(null, true);
  }
});

export const ocrServiceRequest = async (
  { expectedType, file, objectReference, userId },
  { fetchImpl = fetch, deleteImpl = del } = {}
) => {
  const serviceUrl = process.env.RAPIDOCR_SERVICE_URL;
  if (!serviceUrl) {
    const error = new Error('OCR service is not configured.');
    error.status = 502;
    throw error;
  }

  const configuredTimeout = Number.parseInt(process.env.RAPIDOCR_REQUEST_TIMEOUT_MS || '150000', 10);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 150000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let temporaryUrl = null;

  try {
    let body;
    let headers;
    if (objectReference) {
      const decoded = verifyObjectReference(
        objectReference, process.env.OCR_OBJECT_REFERENCE_SECRET, userId
      );
      temporaryUrl = validateTemporaryBlobUrl(decoded.url, process.env.BLOB_STORE_ID, userId);
      body = JSON.stringify({
        expected_document_type: expectedType,
        object_reference: {
          url: temporaryUrl,
          content_type: decoded.content_type,
          size: decoded.size
        }
      });
      headers = {
        'Content-Type': 'application/json',
        'X-OCR-Service-Token': process.env.OCR_INTERNAL_SERVICE_SECRET || ''
      };
    } else {
      body = new FormData();
      body.append('expected_document_type', expectedType);
      body.append('image', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      headers = process.env.OCR_INTERNAL_SERVICE_SECRET
        ? { 'X-OCR-Service-Token': process.env.OCR_INTERNAL_SERVICE_SECRET }
        : undefined;
    }

    const upstream = await fetchImpl(`${serviceUrl.replace(/\/+$/, '')}/ocr`, {
      method: 'POST', body, headers, signal: controller.signal
    });
    const rawBody = await upstream.text();
    let payload;
    try { payload = JSON.parse(rawBody); } catch { payload = { error: 'OCR service returned an invalid response.' }; }
    if ([400, 413, 422].includes(upstream.status)) return { status: upstream.status, payload };
    if (!upstream.ok) return { status: 502, payload: { error: 'OCR service could not process the image.' } };
    return { status: 200, payload };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { status: 504, payload: { error: 'OCR processing timed out. Please enter the information manually or try again.' } };
    }
    if (error?.message?.startsWith('Invalid temporary') || error?.message?.startsWith('Temporary OCR')) {
      return { status: 400, payload: { error: error.message } };
    }
    return { status: error?.status || 502, payload: { error: error?.message === 'OCR service is not configured.'
      ? error.message : 'OCR service is unavailable. You can continue by entering the information manually.' } };
  } finally {
    clearTimeout(timeout);
    if (temporaryUrl) {
      try {
        await deleteImpl(temporaryUrl);
      } catch (cleanupError) {
        console.warn('Temporary OCR object cleanup failed', {
          error_type: cleanupError?.name || 'Error', operation: 'delete'
        });
      }
    }
  }
};

// Vercel Cron safety net for uploads abandoned before OCR. Normal OCR requests delete
// their object immediately in the finally block above.
router.get('/cleanup-temp', async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let cursor;
  let deleted = 0;
  try {
    do {
      const page = await list({ prefix: OCR_TEMP_PREFIX, cursor, limit: 100 });
      const staleUrls = page.blobs.filter(blob => isStaleTemporaryBlob(blob)).map(blob => blob.url);
      if (staleUrls.length) {
        await del(staleUrls);
        deleted += staleUrls.length;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return res.json({ success: true, deleted });
  } catch (error) {
    console.error('Temporary OCR retention cleanup failed', {
      error_type: error?.name || 'Error', http_status: 500
    });
    return res.status(500).json({ error: 'Temporary OCR cleanup failed.' });
  }
});

router.use(authenticateToken);

router.post('/temporary-upload', async (req, res) => {
  if (process.env.OCR_TRANSPORT !== 'blob') {
    return res.status(404).json({ error: 'Temporary OCR uploads are not enabled.' });
  }
  try {
    const response = await handleUpload({
      request: req,
      body: req.body,
      onBeforeGenerateToken: async (pathname) => {
        const expectedPrefix = `${OCR_TEMP_PREFIX}${String(req.user.id)}/`;
        if (!pathname.startsWith(expectedPrefix)
            || !/^[a-zA-Z0-9_-]+\/[0-9a-f-]{36}\.(?:jpe?g|jfif|png|bmp)$/i.test(pathname.slice(OCR_TEMP_PREFIX.length))) {
          throw new Error('Invalid temporary OCR object name.');
        }
        return {
          allowedContentTypes: [...ALLOWED_OCR_MIME_TYPES],
          maximumSizeInBytes: MAX_OCR_UPLOAD_BYTES,
          validUntil: Date.now() + (10 * 60 * 1000),
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 60,
          tokenPayload: JSON.stringify({ user_id: String(req.user.id) })
        };
      }
    });
    return res.json(response);
  } catch (error) {
    return res.status(400).json({ error: 'Temporary OCR upload could not be authorized.' });
  }
});

router.post('/temporary-reference', async (req, res) => {
  let url;
  try {
    url = validateTemporaryBlobUrl(req.body?.url, process.env.BLOB_STORE_ID, req.user.id);
    const metadata = await head(url);
    validateTemporaryBlobMetadata(metadata);
    const reference = signObjectReference({
      url,
      contentType: metadata.contentType,
      size: metadata.size,
      userId: req.user.id
    }, process.env.OCR_OBJECT_REFERENCE_SECRET);
    return res.json({ object_reference: reference });
  } catch (error) {
    if (url) {
      try { await del(url); } catch { /* retention cleanup remains as a safety net */ }
    }
    return res.status(error?.message === 'Image exceeds the 20 MB limit.' ? 413 : 400)
      .json({ error: error?.message || 'Invalid temporary OCR object.' });
  }
});

// Analyze an admission image without persisting the file or extracted student fields.
router.post('/extract', (req, res) => {
  if (req.is('application/json')) {
    const expectedType = String(req.body?.expected_document_type || '').trim().toLowerCase();
    if (!['cnic', 'matric', 'inter'].includes(expectedType)) {
      return res.status(400).json({ error: 'expected_document_type must be cnic, matric, or inter.' });
    }
    if (!req.body?.object_reference) {
      return res.status(400).json({ error: 'Temporary OCR object reference is required.' });
    }
    return ocrServiceRequest({
      expectedType, objectReference: req.body.object_reference, userId: req.user.id
    }).then(({ status, payload }) => res.status(status).json(payload));
  }

  uploadOcrImage.single('image')(req, res, async (uploadError) => {
    if (uploadError) {
      if (uploadError.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Image exceeds the 20 MB limit.' });
      }
      return res.status(400).json({ error: 'Upload one JPG, JPEG, PNG, JFIF, or BMP image.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Document image is required.' });
    }
    const expectedType = String(req.body.expected_document_type || '').trim().toLowerCase();
    if (!['cnic', 'matric', 'inter'].includes(expectedType)) {
      return res.status(400).json({ error: 'expected_document_type must be cnic, matric, or inter.' });
    }

    const { status, payload } = await ocrServiceRequest({ expectedType, file: req.file, userId: req.user.id });
    return res.status(status).json(payload);
  });
});

const verifyAcademicDocumentPayload = (type, extractedData, confidence) => {
  if (type !== 'matric' && type !== 'intermediate') {
    return { isValid: true, error: null };
  }

  const data = extractedData && typeof extractedData === 'object' ? extractedData : {};
  const rawText = String(data.raw_text || '');
  const expectedMarkers = type === 'matric'
    ? /secondary\s+school\s+certificate|\bmatric(?:ulation)?\b|\bssc\b|10th\s+class|grade\s*x\b/i
    : /\bintermediate\b|higher\s+secondary\s+certificate|\bhssc\b|12th\s+class|f\.?\s*sc|f\.?\s*a\b|i\.?\s*cs|i\.?\s*com/i;
  const oppositeMarkers = type === 'matric'
    ? /\bintermediate\b|higher\s+secondary\s+certificate|\bhssc\b|12th\s+class|f\.?\s*sc|f\.?\s*a\b|i\.?\s*cs|i\.?\s*com/i
    : /secondary\s+school\s+certificate|\bmatric(?:ulation)?\b|\bssc\b|10th\s+class|grade\s*x\b/i;
  const detectedLevel = data.document_level;
  const hasExpectedLevel = detectedLevel === type;
  const hasOppositeLevel = detectedLevel !== type;
  const hasAcademicStructure = Boolean(
    data.board || data.passing_year ||
    data.obtained_marks !== null && data.obtained_marks !== undefined ||
    data.total_marks !== null && data.total_marks !== undefined ||
    data.subjects?.length
  );
  const obtainedMarks = Number(data.obtained_marks);
  const totalMarks = Number(data.total_marks);
  const hasConsistentMarks = (
    data.obtained_marks === null || data.obtained_marks === undefined ||
    data.total_marks === null || data.total_marks === undefined ||
    (Number.isFinite(obtainedMarks) && Number.isFinite(totalMarks) &&
      obtainedMarks >= 0 && totalMarks > 0 && obtainedMarks <= totalMarks)
  );
  const passingYear = Number(data.passing_year);
  const hasValidPassingYear = !data.passing_year ||
    (Number.isInteger(passingYear) && passingYear >= 1900 && passingYear <= new Date().getFullYear() + 1);
  const subjectMarks = Array.isArray(data.subjects)
    ? data.subjects.map(subject => Number(subject.obtainedMarks)).filter(Number.isFinite)
    : [];
  const hasConsistentSubjectTotals = subjectMarks.length === 0 ||
    !Number.isFinite(totalMarks) || subjectMarks.reduce((sum, marks) => sum + marks, 0) <= totalMarks;
  // See the note in DocumentUpload.jsx: mean OCR confidence is dominated by watermark
  // noise on these documents, so it is not a reliable rejection criterion. The numeric
  // plausibility gate below is what protects the merit-critical values.
  const hasSufficientConfidence = confidence === undefined || confidence === null || confidence === 0 || confidence >= 15;

  if (hasOppositeLevel || (oppositeMarkers.test(rawText) && !expectedMarkers.test(rawText))) {
    return {
      isValid: false,
      error: type === 'matric'
        ? 'Invalid document. Please upload your Matric/SSC certificate.'
        : 'Invalid document. Please upload your Intermediate/HSSC certificate.'
    };
  }

  if (!hasExpectedLevel || !hasAcademicStructure ||
    !hasConsistentMarks || !hasValidPassingYear || !hasConsistentSubjectTotals || !hasSufficientConfidence) {
    return {
      isValid: false,
      error: type === 'matric'
        ? 'Document verification failed. Please upload the original, unedited Matric/SSC document.'
        : 'Document verification failed. Please upload the original, unedited Intermediate/HSSC document.'
    };
  }

  return { isValid: true, error: null };
};

// Numeric plausibility gate.
// The client computes the percentage that decides merit rank, so it has to be
// re-checked here: verifyAcademicDocumentPayload above only confirms that fields are
// present and that marks are internally ordered, not that the percentage agrees with
// them. Without this, a crafted request can set its own merit score.
const ACADEMIC_TOTAL_MIN = 100;
const ACADEMIC_TOTAL_MAX = 2000;

const validateAcademicPlausibility = (type, extractedData) => {
  if (type !== 'matric' && type !== 'intermediate') {
    return { isValid: true, error: null };
  }
  const d = extractedData && typeof extractedData === 'object' ? extractedData : {};
  const missing = v => v === null || v === undefined || v === '';
  const obtained = Number(d.obtained_marks);
  const total = Number(d.total_marks);
  const pct = Number(d.percentage);

  if (missing(d.obtained_marks) || missing(d.total_marks) ||
    !Number.isFinite(obtained) || !Number.isFinite(total)) {
    return { isValid: false, error: 'Obtained and total marks are required for academic documents.' };
  }
  if (total < ACADEMIC_TOTAL_MIN || total > ACADEMIC_TOTAL_MAX) {
    return { isValid: false, error: 'Total marks are outside the accepted range.' };
  }
  if (obtained < 0 || obtained > total) {
    return { isValid: false, error: 'Obtained marks cannot exceed total marks.' };
  }
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
    return { isValid: false, error: 'Percentage is missing or outside the valid range.' };
  }
  if (Math.abs(pct - (obtained / total) * 100) > 0.5) {
    return { isValid: false, error: 'Percentage does not match the submitted marks.' };
  }

  const year = Number(d.passing_year);
  if (d.passing_year && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1)) {
    return { isValid: false, error: 'Passing year is not a valid year.' };
  }

  const subjectSum = Array.isArray(d.subjects)
    ? d.subjects.map(s => Number(s.obtainedMarks)).filter(Number.isFinite).reduce((a, b) => a + b, 0)
    : 0;
  if (subjectSum > total) {
    return { isValid: false, error: 'Subject marks exceed the total marks.' };
  }

  return { isValid: true, error: null };
};

// 1. Upload & Persist Document in Database
router.post('/upload-document', async (req, res) => {
  try {
    const {
      type,
      name,
      file_data,
      file_url,
      mime_type,
      size,
      extracted_data,
      confidence
    } = req.body;

    if (!type || !name) {
      return res.status(400).json({ error: 'Document type and name are required' });
    }

    const verification = verifyAcademicDocumentPayload(type, extracted_data, confidence);
    if (!verification.isValid) {
      return res.status(400).json({ error: verification.error });
    }

    const plausibility = validateAcademicPlausibility(type, extracted_data);
    if (!plausibility.isValid) {
      return res.status(400).json({ error: plausibility.error });
    }

    const userId = req.user.id;

    // Upsert document record in MongoDB Document collection
    const document = await Document.findOneAndUpdate(
      { user_id: userId, type: type },
      {
        user_id: userId,
        type: type,
        name: name,
        file_data: file_data || null,
        file_url: file_url || null,
        mime_type: mime_type || 'application/pdf',
        size: size || 0,
        extracted_data: extracted_data || {},
        confidence: confidence !== undefined ? confidence : 100,
        uploaded_at: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Synchronize user.uploaded_documents array
    const user = await User.findById(userId);
    if (user) {
      const currentUploaded = user.uploaded_documents || [];
      if (!currentUploaded.includes(type)) {
        user.uploaded_documents = [...currentUploaded, type];
        await user.save();
      }
    }

    res.status(200).json({
      message: 'Document saved in database successfully',
      document
    });
  } catch (error) {
    console.error('OCR document save failed', { error_type: error?.name || 'Error', http_status: 500 });
    res.status(500).json({ error: 'Failed to save document in database' });
  }
});

// 2. Fetch All Stored Documents for Current User
router.get('/my-documents', async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await Document.find({ user_id: userId })
      .select('-file_data')
      .sort({ uploaded_at: 1 });

    const user = await User.findById(userId);
    const userDocTypes = user?.uploaded_documents || [];

    const existingTypes = new Set(documents.map(d => d.type));
    const resultDocs = documents.map(d => d.toObject());

    const typeNames = {
      cnic: 'CNIC / B-Form',
      photograph: 'Recent Photograph',
      matric: 'Matric Certificate',
      intermediate: 'Intermediate Certificate',
      transcript: 'Transcript / Mark Sheet',
      domicile: 'Domicile Certificate'
    };

    // If User record already has verified/uploaded types without a Document record, synthesize entry so it stays visible
    for (const dt of userDocTypes) {
      if (!existingTypes.has(dt)) {
        resultDocs.push({
          _id: `synthesized-${dt}`,
          user_id: userId,
          type: dt,
          name: `${typeNames[dt] || dt}`,
          file_data: null,
          file_url: null,
          extracted_data: {},
          confidence: 100,
          uploaded_at: user.updated_at || user.created_at || new Date()
        });
      }
    }

    res.json({
      documents: resultDocs,
      uploaded_types: userDocTypes,
      is_verified: user?.is_verified ?? false
    });
  } catch (error) {
    console.error('OCR document fetch failed', { error_type: error?.name || 'Error', http_status: 500 });
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// 3. Delete Document by Type from Database
router.delete('/my-documents/type/:docType', async (req, res) => {
  try {
    const userId = req.user.id;
    const { docType } = req.params;

    // Delete from Document collection
    await Document.deleteMany({ user_id: userId, type: docType });

    // Update User.uploaded_documents
    const user = await User.findById(userId);
    if (user) {
      const remaining = (user.uploaded_documents || []).filter(t => t !== docType);
      user.uploaded_documents = remaining;

      // Check if any mandatory document is missing
      const mandatoryTypes = ['cnic', 'photograph', 'matric', 'intermediate'];
      const hasAllMandatory = mandatoryTypes.every(m => remaining.includes(m));
      if (!hasAllMandatory) {
        user.is_verified = false;
      }

      await user.save();

      return res.json({
        message: 'Document deleted from database successfully',
        uploaded_documents: user.uploaded_documents,
        is_verified: user.is_verified
      });
    }

    res.json({ message: 'Document deleted from database' });
  } catch (error) {
    console.error('OCR document delete failed', { error_type: error?.name || 'Error', http_status: 500 });
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// 4. Delete Document by ID from Database
router.delete('/my-documents/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    let docType = null;
    if (id.startsWith('synthesized-')) {
      docType = id.replace('synthesized-', '');
    } else {
      const doc = await Document.findOne({ _id: id, user_id: userId });
      if (doc) {
        docType = doc.type;
        await Document.deleteOne({ _id: id });
      }
    }

    const user = await User.findById(userId);
    if (user && docType) {
      const remaining = (user.uploaded_documents || []).filter(t => t !== docType);
      user.uploaded_documents = remaining;

      const mandatoryTypes = ['cnic', 'photograph', 'matric', 'intermediate'];
      const hasAllMandatory = mandatoryTypes.every(m => remaining.includes(m));
      if (!hasAllMandatory) {
        user.is_verified = false;
      }

      await user.save();
    }

    res.json({
      message: 'Document deleted from database successfully',
      uploaded_documents: user?.uploaded_documents || [],
      is_verified: user?.is_verified ?? false
    });
  } catch (error) {
    console.error('OCR document delete-all failed', { error_type: error?.name || 'Error', http_status: 500 });
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// 5. Retrieve Single Document Data / File
router.get('/document/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only allow owner or admin
    if (doc.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ document: doc });
  } catch (error) {
    console.error('OCR document read failed', { error_type: error?.name || 'Error', http_status: 500 });
    res.status(500).json({ error: 'Failed to get document' });
  }
});

export default router;
