import express from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Program from '../models/Program.js';
import User from '../models/User.js';

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
  body('documents').optional().isArray(),
  body('priority').isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { program_id, academic_records, documents, priority, extracurriculars, personal_statement } = req.body;
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

    const existingPriorityApp = await Application.findOne({
      user_id: userId,
      priority: priority
    });

    if (existingPriorityApp) {
      return res.status(400).json({ error: `You have already selected priority ${priority} for another program.` });
    }
    // Fetch program and enforce eligibility
    const program = await findProgram(program_id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const submittedPercentage = parseFloat(academic_records.percentage || academic_records.fsc_percentage || academic_records.matric_percentage || 0);
    const isEligible = submittedPercentage >= program.min_percentage;

    if (!isEligible) {
      return res.status(400).json({
        error: `Your percentage (${submittedPercentage}%) is below the minimum required percentage (${program.min_percentage}%) for ${program.name}. Application cannot be submitted.`
      });
    }
    const sanitizedDocuments = (documents || []).map(doc => {
      const allowedTypes = ['cnic', 'matric', 'fsc', 'entry_test', 'other'];
      let docType = doc.type;
      if (!allowedTypes.includes(docType)) {
        docType = 'other';
      }
      return {
        type: docType,
        filename: doc.filename || doc.name || 'document',
        url: doc.url || ''
      };
    });

    const application = await Application.create({
      user_id: userId,
      program_id,
      matric_percentage: parseFloat(academic_records.matric_percentage || academic_records.percentage || 0),
      fsc_percentage: parseFloat(academic_records.fsc_percentage || academic_records.percentage || 0),
      entry_test_marks: parseFloat(academic_records.entry_test_marks || 0),
      documents: sanitizedDocuments,
      priority,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

router.get('/my-applications', async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({ user_id: userId })
      .populate('program_id', 'name department total_seats merit_seats quota_seats self_finance_seats')
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

router.get('/tracking/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await Application.findById(applicationId);

    if (!application && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return empty tracking for now - can be enhanced later with proper tracking model
    res.json({ tracking: [] });
  } catch (error) {
    console.error('Fetch tracking error:', error);
    res.status(500).json({ error: 'Failed to fetch tracking information' });
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

    // Calculate actual student percentage from academic records (matric & inter)
    let studentPercentage = 0;
    if (user) {
      const interObt = parseFloat(user.inter_obtained_marks);
      const interTot = parseFloat(user.inter_total_marks);
      const matricObt = parseFloat(user.matric_obtained_marks);
      const matricTot = parseFloat(user.matric_total_marks);

      const interPct = (!isNaN(interObt) && !isNaN(interTot) && interTot > 0) ? (interObt / interTot) * 100 : null;
      const matricPct = (!isNaN(matricObt) && !isNaN(matricTot) && matricTot > 0) ? (matricObt / matricTot) * 100 : null;

      if (interPct !== null && matricPct !== null) {
        studentPercentage = parseFloat(((interPct + matricPct) / 2).toFixed(2));
      } else if (interPct !== null) {
        studentPercentage = parseFloat(interPct.toFixed(2));
      } else if (matricPct !== null) {
        studentPercentage = parseFloat(matricPct.toFixed(2));
      }
    }

    const meetsPercentage = studentPercentage >= program.min_percentage;

    const eligibility = {
      eligible: meetsPercentage,
      percentage: {
        required: program.min_percentage,
        obtained: studentPercentage,
        meets: meetsPercentage
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

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.user_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Application.findByIdAndDelete(id);

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

export default router;
