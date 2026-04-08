import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', [
  body('program_id').isUUID(),
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

    const { data: existingApp } = await supabase
      .from('applications')
      .select('*')
      .eq('student_id', userId)
      .eq('program_id', program_id)
      .single();

    if (existingApp) {
      return res.status(400).json({ error: 'You have already applied to this program' });
    }

    const { data: application, error } = await supabase
      .from('applications')
      .insert([{
        student_id: userId,
        program_id,
        academic_records,
        documents,
        priority,
        extracurriculars,
        personal_statement,
        status: 'pending',
        application_date: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase.from('application_tracking').insert([{
      application_id: application.id,
      status: 'submitted',
      notes: 'Application submitted successfully',
      timestamp: new Date().toISOString()
    }]);

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

    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        *,
        programs:program_id (name, department, total_seats, merit_seats, quota_seats, self_finance_seats)
      `)
      .eq('student_id', userId)
      .order('application_date', { ascending: false });

    if (error) throw error;

    res.json({ applications });
  } catch (error) {
    console.error('Fetch applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

router.get('/tracking/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const { data: application } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('student_id', userId)
      .single();

    if (!application && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: tracking, error } = await supabase
      .from('application_tracking')
      .select('*')
      .eq('application_id', applicationId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    res.json({ tracking });
  } catch (error) {
    console.error('Fetch tracking error:', error);
    res.status(500).json({ error: 'Failed to fetch tracking information' });
  }
});

router.get('/programs', async (req, res) => {
  try {
    const { data: programs, error } = await supabase
      .from('programs')
      .select('*')
      .order('name');

    if (error) throw error;

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

    const { data: user } = await supabase
      .from('users')
      .select('academic_records')
      .eq('id', userId)
      .single();

    const { data: program } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const academicRecords = user?.academic_records || {};
    const studentPercentage = academicRecords.percentage || 0;
    const requiredSubjects = program.required_subjects || [];
    const studentSubjects = academicRecords.subjects || [];

    const hasRequiredSubjects = requiredSubjects.every(sub => 
      studentSubjects.some(s => s.toLowerCase().includes(sub.toLowerCase()))
    );

    const meetsPercentage = studentPercentage >= program.min_percentage;

    const eligibility = {
      eligible: hasRequiredSubjects && meetsPercentage,
      percentage: {
        required: program.min_percentage,
        obtained: studentPercentage,
        meets: meetsPercentage
      },
      subjects: {
        required: requiredSubjects,
        obtained: studentSubjects,
        meets: hasRequiredSubjects
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
