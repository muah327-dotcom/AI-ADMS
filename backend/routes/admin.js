import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/dashboard-stats', async (req, res) => {
  try {
    const { data: totalApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact' });

    const { data: pendingApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('status', 'pending');

    const { data: approvedApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    const { data: rejectedApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('status', 'rejected');

    const { data: students } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'student');

    const { data: programs } = await supabase
      .from('programs')
      .select('*');

    const { data: meritListCount } = await supabase
      .from('merit_list')
      .select('*', { count: 'exact' });

    res.json({
      stats: {
        totalApplications: totalApplications?.length || 0,
        pendingApplications: pendingApplications?.length || 0,
        approvedApplications: approvedApplications?.length || 0,
        rejectedApplications: rejectedApplications?.length || 0,
        totalStudents: students?.length || 0,
        totalPrograms: programs?.length || 0,
        meritListEntries: meritListCount?.length || 0
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

router.get('/all-applications', async (req, res) => {
  try {
    const { status, program, page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('applications')
      .select(`
        *,
        student:student_id (id, full_name, email, cnic, phone),
        program:program_id (name, department)
      `, { count: 'exact' })
      .order('application_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (program) {
      query = query.eq('program_id', program);
    }

    const { data: applications, error, count } = await query;

    if (error) throw error;

    res.json({ 
      applications, 
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Fetch all applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

router.patch('/applications/:id/status', [
  body('status').isIn(['pending', 'under_review', 'approved', 'rejected', 'waitlisted']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const { data: application, error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('application_tracking').insert([{
      application_id: id,
      status,
      notes: notes || `Status updated to ${status} by admin`,
      timestamp: new Date().toISOString(),
      updated_by: req.user.id
    }]);

    res.json({ message: 'Application status updated', application });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const { category, program, page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('users')
      .select(`
        *,
        applications:applications (program:program_id (name), status, admission_category)
      `, { count: 'exact' })
      .eq('role', 'student')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (category) {
      query = query.eq('admission_category', category);
    }

    const { data: students, error, count } = await query;

    if (error) throw error;

    res.json({ 
      students, 
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.post('/programs', [
  body('name').trim().notEmpty(),
  body('department').trim().notEmpty(),
  body('total_seats').isInt({ min: 1 }),
  body('min_percentage').isFloat({ min: 0, max: 100 }),
  body('required_subjects').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const programData = req.body;

    const { data: program, error } = await supabase
      .from('programs')
      .insert([{
        ...programData,
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Program created successfully', program });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Failed to create program' });
  }
});

router.patch('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: program, error } = await supabase
      .from('programs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Program updated successfully', program });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Failed to update program' });
  }
});

export default router;
