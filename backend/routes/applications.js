import express from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Program from '../models/Program.js';
import User from '../models/User.js';
import Document from '../models/Document.js';

const router = express.Router();

router.use(authenticateToken);

const findProgram = async (identifier) => {
  if (!identifier) return null;
  const decoded = decodeURIComponent(identifier).trim();
  if (mongoose.Types.ObjectId.isValid(decoded)) {
    const prog = await Program.findById(decoded);
    if (prog) return prog;
  }
  return await Program.findOne({
    $or: [
      { name: decoded },
      { name: new RegExp(`^${decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    ]
  });
};

router.post('/', [
  body('program_id').isMongoId(),
  body('academic_records').isObject(),
  body('documents').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { program_id, academic_records, documents, extracurriculars, personal_statement } = req.body;
    const userId = req.user.id;

    // Enforce profile verification & mandatory non-optional documents upload
    const user = await User.findById(userId);
    const requiredDocTypes = ['cnic', 'photograph', 'matric', 'intermediate'];
    const userDocs = user?.uploaded_documents || [];
    const missingDocs = requiredDocTypes.filter(type => !userDocs.includes(type));

    if (!user?.is_verified || missingDocs.length > 0) {
      return res.status(400).json({
        error: 'Application submission blocked: All non-optional mandatory documents (CNIC, Photograph, Matric Certificate, Intermediate Certificate) must be uploaded and profile verified first.'
      });
    }

    const existingApp = await Application.findOne({
      user_id: userId,
      program_id: program_id
    });

    if (existingApp) {
      return res.status(400).json({ error: 'Application already exists for this program' });
    }
    // Fetch program and enforce eligibility
    const program = await findProgram(program_id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Eligibility and merit are based on Intermediate percentage only. Prefer the
    // verified profile values so the result cannot differ from the eligibility preview.
    const interObtained = parseFloat(user.inter_obtained_marks);
    const interTotal = parseFloat(user.inter_total_marks);
    const profileIntermediatePercentage = (!isNaN(interObtained) && !isNaN(interTotal) && interTotal > 0)
      ? parseFloat(((interObtained / interTotal) * 100).toFixed(2))
      : null;
    const submittedPercentage = profileIntermediatePercentage ?? parseFloat(academic_records.percentage || academic_records.fsc_percentage || 0);

    const matricObtained = parseFloat(user.matric_obtained_marks);
    const matricTotal = parseFloat(user.matric_total_marks);
    const profileMatricPercentage = (!isNaN(matricObtained) && !isNaN(matricTotal) && matricTotal > 0)
      ? parseFloat(((matricObtained / matricTotal) * 100).toFixed(2))
      : null;
    const isEligible = submittedPercentage >= program.min_percentage;

    if (!isEligible) {
      return res.status(400).json({
        error: `Your percentage (${submittedPercentage}%) is below the minimum required percentage (${program.min_percentage}%) for ${program.name}. Application cannot be submitted.`
      });
    }

    // Check intermediate qualification eligibility
    const requiredQuals = program.requiredIntermediateQualifications || [];
    const studentQualification = user?.inter_qualification || null;
    if (requiredQuals.length > 0 && (!studentQualification || !requiredQuals.includes(studentQualification))) {
      return res.status(400).json({
        error: `You are not eligible for ${program.name} because your Intermediate qualification (${studentQualification || 'Not specified'}) does not meet the program requirement. Required: ${requiredQuals.join(', ')}.`
      });
    }

    const allowedDocTypes = ['cnic', 'photograph', 'matric', 'intermediate', 'fsc', 'transcript', 'domicile', 'entry_test', 'other'];

    let sanitizedDocuments = (documents || []).map(doc => {
      let docType = doc.type;
      if (!allowedDocTypes.includes(docType)) {
        docType = 'other';
      }
      return {
        type: docType,
        filename: doc.filename || doc.name || 'document',
        url: doc.url || doc.file_url || ''
      };
    });

    if (sanitizedDocuments.length === 0) {
      const userStoredDocs = await Document.find({ user_id: userId }).select('-file_data');
      if (userStoredDocs && userStoredDocs.length > 0) {
        sanitizedDocuments = userStoredDocs.map(doc => {
          let docType = doc.type;
          if (!allowedDocTypes.includes(docType)) {
            docType = 'other';
          }
          return {
            type: docType,
            filename: doc.name || 'document',
            url: doc.file_url || ''
          };
        });
      }
    }

    const application = await Application.create({
      user_id: userId,
      program_id,
      matric_percentage: profileMatricPercentage ?? parseFloat(academic_records.matric_percentage || 0),
      fsc_percentage: submittedPercentage,
      entry_test_marks: parseFloat(academic_records.entry_test_marks || 0),
      cnic: user.cnic || null,
      phone: user.phone || null,
      address: user.address || null,
      documents: sanitizedDocuments,
      priority: 1,
      personal_statement: personal_statement || '',
      extracurriculars: extracurriculars || '',
      status: 'pending'
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit application' });
  }
});

router.get('/my-applications', async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({ user_id: userId })
      .populate('program_id', 'name department total_seats')
      .sort({ application_date: -1 });

    const mappedApplications = applications.map(app => {
      const appObj = app.toObject();
      appObj.programs = appObj.program_id;
      appObj.program = appObj.program_id;
      appObj.id = appObj._id;
      return appObj;
    });

    res.json({ applications: mappedApplications });
  } catch (error) {
    console.error('Fetch applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

router.get('/programs', async (req, res) => {
  try {
    const programs = await Program.find().sort({ name: 1 });

    res.json({ programs: programs || [] });
  } catch (error) {
    console.error('Fetch programs error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

router.get('/programs/:id/eligibility', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [program, user] = await Promise.all([
      findProgram(id),
      User.findById(userId)
    ]);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Eligibility is based exclusively on the verified Intermediate marks.
    let studentPercentage = 0;
    if (user) {
      const interObt = parseFloat(user.inter_obtained_marks);
      const interTot = parseFloat(user.inter_total_marks);

      if (!isNaN(interObt) && !isNaN(interTot) && interTot > 0) {
        studentPercentage = parseFloat(((interObt / interTot) * 100).toFixed(2));
      }
    }

    const meetsPercentage = studentPercentage >= program.min_percentage;

    // Check intermediate qualification eligibility
    const requiredQuals = program.requiredIntermediateQualifications || [];
    const studentQualification = user?.inter_qualification || null;
    const meetsQualification = requiredQuals.length === 0 || (studentQualification && requiredQuals.includes(studentQualification));

    const eligibility = {
      eligible: meetsPercentage && meetsQualification,
      percentage: {
        required: program.min_percentage,
        obtained: studentPercentage,
        meets: meetsPercentage
      },
      qualification: {
        required: requiredQuals,
        obtained: studentQualification,
        meets: meetsQualification
      },
      subjects: {
        required: program.required_subjects || [],
        obtained: [],
        meets: true
      },
      program_details: program
    };

    res.json(eligibility);
  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

export default router;
