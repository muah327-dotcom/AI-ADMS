import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Document from '../models/Document.js';
import User from '../models/User.js';

const router = express.Router();

router.use(authenticateToken);

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
    const documents = await Document.find({ user_id: userId }).sort({ uploaded_at: 1 });

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
