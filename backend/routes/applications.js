import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Program from '../models/Program.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', [
  body('program_id').isMongoId(),
  body('academic_records').isObject(),
  body('documents').isArray(),
  body('priority').isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { program_id, academic_records, documents, priority, extracurriculars, personal_statement } = req.body;
    const userId = req.user.id;

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
    const program = await Program.findById(program_id);
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

    const program = await Program.findById(id);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const eligibility = {
      eligible: true,
      percentage: {
        required: program.min_percentage,
        obtained: 0,
        meets: true
      },
      subjects: {
        required: program.required_subjects,
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
