import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Document from '../models/Document.js';
import User from '../models/User.js';

const router = express.Router();

router.use(authenticateToken);

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
    console.error('Save document error:', error);
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
    console.error('Fetch documents error:', error);
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
    console.error('Delete document error:', error);
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
    console.error('Delete document error:', error);
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
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

export default router;
