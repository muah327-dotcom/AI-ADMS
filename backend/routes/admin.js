import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import Program from '../models/Program.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/dashboard-stats', async (req, res) => {
  try {
    const total = await Application.countDocuments();
    const pending = await Application.countDocuments({ status: 'pending' });
    const approved = await Application.countDocuments({ status: 'approved' });
    const rejected = await Application.countDocuments({ status: 'rejected' });
    const activePrograms = await Program.countDocuments({ is_active: true });
    const students = await User.countDocuments({ role: 'student' });
    const programs = await Program.countDocuments();
    const meritListCount = await Application.countDocuments({ status: 'approved' });

    res.json({
      stats: {
        totalApplications: total,
        pendingApplications: pending,
        approvedApplications: approved,
        rejectedApplications: rejected,
        totalStudents: students,
        totalPrograms: programs,
        meritListEntries: meritListCount
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
    
    let query = Application.find();
    
    if (status) {
      query = query.where('status').equals(status);
    }

    if (program) {
      query = query.where('program_id').equals(program);
    }

    const applications = await query
      .populate('user_id', 'full_name email cnic phone')
      .populate('program_id', 'name department')
      .sort({ application_date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const count = await Application.countDocuments(query.getFilter());

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

    const application = await Application.findByIdAndUpdate(
      id,
      { status, updated_at: new Date() },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application status updated', application });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

router.get('/all-users', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const students = await User.find({ role: 'student' })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const count = await User.countDocuments({ role: 'student' });

    res.json({ 
      students, 
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Fetch all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const { category, program, page = 1, limit = 20 } = req.query;
    
    let query = User.find({ role: 'student' })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    if (category) {
      query = query.where('admission_category').equals(category);
    }

    if (program) {
      query = query.where('program_id').equals(program);
    }

    const students = await query;

    const count = await User.countDocuments({ role: 'student' });

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
