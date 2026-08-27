import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import Program from '../models/Program.js';
import Document from '../models/Document.js';
import Department from '../models/Department.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/dashboard-stats', async (req, res) => {
  try {
    const [
      total,
      pending,
      approved,
      confirmed,
      waitlisted,
      rejected,
      dropped,
      totalStudents,
      totalPrograms,
      programAgg,
      quotaCount,
      selfFinanceCount
    ] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: 'pending' }),
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'confirmed' }),
      Application.countDocuments({ status: 'waitlisted' }),
      Application.countDocuments({ status: 'rejected' }),
      Application.countDocuments({ status: 'dropped' }),
      User.countDocuments({ role: 'student' }),
      Program.countDocuments(),
      
      // Program distribution via aggregation
      Application.aggregate([
        {
          $group: {
            _id: '$program_id',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'programs',
            localField: '_id',
            foreignField: '_id',
            as: 'program'
          }
        },
        {
          $unwind: '$program'
        },
        {
          $project: {
            name: '$program.name',
            count: 1,
            _id: 0
          }
        }
      ]),
      
      // Category counts using regex
      Application.countDocuments({
        status: { $in: ['approved', 'confirmed', 'waitlisted'] },
        remarks: { $regex: /quota/i }
      }),
      Application.countDocuments({
        status: { $in: ['approved', 'confirmed', 'waitlisted'] },
        remarks: { $regex: /self_finance/i }
      })
    ]);

    const admittedCount = approved + confirmed;
    const admissionRate = total > 0 ? (admittedCount / total) * 100 : 0;
    
    // Calculate merit count
    const totalAdmittedApps = approved + confirmed + waitlisted;
    const meritCount = Math.max(0, totalAdmittedApps - quotaCount - selfFinanceCount);

    res.json({
      stats: {
        totalApplications: total,
        pendingApplications: pending,
        approvedApplications: approved,
        confirmedApplications: confirmed,
        admittedStudents: admittedCount,
        admissionRate: Math.round(admissionRate * 10) / 10,
        waitlistedApplications: waitlisted,
        rejectedApplications: rejected,
        droppedApplications: dropped,
        totalStudents,
        totalPrograms,
        programDistribution: programAgg,
        categoryDistribution: {
          merit: meritCount,
          quota: quotaCount,
          self_finance: selfFinanceCount
        }
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
    
    if (status && status !== 'all') {
      query = query.where('status').equals(status);
    }

    if (program && program !== 'all') {
      query = query.where('program_id').equals(program);
    }

    const [applications, count] = await Promise.all([
      query
        .populate('user_id', 'full_name email cnic phone father_name father_phone alternate_phone date_of_birth gender address permanent_address matric_board matric_passing_year matric_obtained_marks matric_total_marks inter_board inter_passing_year inter_obtained_marks inter_total_marks is_verified uploaded_documents avatar_url')
        .populate('program_id', 'name department min_percentage required_subjects total_seats admission_fee tuition_fee total_fee')
        .sort({ application_date: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Application.countDocuments(query.getFilter())
    ]);

    // Fetch all documents for students in these applications
    const userIds = [...new Set(applications.map(app => app.user_id?._id || app.user_id).filter(Boolean))];
    const documents = await Document.find({ user_id: { $in: userIds } }).sort({ uploaded_at: 1 });

    const mappedApplications = applications.map(app => {
      const appObj = app.toObject();
      const studentId = (appObj.user_id?._id || appObj.user_id)?.toString();
      const userDocs = documents.filter(d => d.user_id?.toString() === studentId);

      appObj.student = appObj.user_id;
      appObj.program = appObj.program_id;
      appObj.programs = appObj.program_id;
      appObj.id = appObj._id;
      appObj.student_documents = userDocs;
      return appObj;
    });

    res.json({ 
      applications: mappedApplications, 
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Fetch all applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

router.get('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id)
      .populate('user_id', 'full_name email cnic phone father_name father_phone alternate_phone date_of_birth gender address permanent_address matric_board matric_passing_year matric_obtained_marks matric_total_marks inter_board inter_passing_year inter_obtained_marks inter_total_marks is_verified uploaded_documents avatar_url')
      .populate('program_id', 'name department min_percentage required_subjects total_seats admission_fee tuition_fee total_fee');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const appObj = application.toObject();
    const studentId = (appObj.user_id?._id || appObj.user_id)?.toString();
    const studentDocs = await Document.find({ user_id: studentId }).sort({ uploaded_at: 1 });

    appObj.student = appObj.user_id;
    appObj.program = appObj.program_id;
    appObj.programs = appObj.program_id;
    appObj.id = appObj._id;
    appObj.student_documents = studentDocs;

    res.json({ application: appObj });
  } catch (error) {
    console.error('Fetch application detail error:', error);
    res.status(500).json({ error: 'Failed to fetch application details' });
  }
});

router.get('/student/:userId/documents', async (req, res) => {
  try {
    const { userId } = req.params;
    const documents = await Document.find({ user_id: userId }).sort({ uploaded_at: 1 });
    const user = await User.findById(userId).select('-password');

    res.json({
      student: user,
      documents
    });
  } catch (error) {
    console.error('Fetch student documents error:', error);
    res.status(500).json({ error: 'Failed to fetch student documents' });
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
      { 
        status, 
        remarks: notes ? notes : undefined,
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        updated_at: new Date() 
      },
      { new: true }
    )
      .populate('user_id', 'full_name email cnic phone father_name date_of_birth gender address matric_board matric_passing_year matric_obtained_marks matric_total_marks inter_board inter_passing_year inter_obtained_marks inter_total_marks')
      .populate('program_id', 'name department');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const appObj = application.toObject();
    appObj.student = appObj.user_id;
    appObj.program = appObj.program_id;
    appObj.programs = appObj.program_id;
    appObj.id = appObj._id;

    res.json({ message: 'Application status updated', application: appObj });
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

    if (category && category !== 'all') {
      query = query.where('admission_category').equals(category);
    }

    if (program && program !== 'all') {
      query = query.where('program_id').equals(program);
    }

    const [students, count] = await Promise.all([
      query,
      User.countDocuments(query.getFilter())
    ]);

    const studentIds = students.map(s => s._id);
    const [documents, userApplications] = await Promise.all([
      Document.find({ user_id: { $in: studentIds } }).sort({ uploaded_at: 1 }),
      Application.find({ user_id: { $in: studentIds } }).populate('program_id', 'name department')
    ]);

    const mappedStudents = students.map(student => {
      const sObj = student.toObject();
      sObj.id = sObj._id;
      sObj.documents = documents.filter(d => d.user_id.toString() === sObj._id.toString());
      sObj.applications = userApplications.filter(a => a.user_id.toString() === sObj._id.toString());
      return sObj;
    });

    res.json({ 
      students: mappedStudents, 
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ----------------------------------------
// DEPARTMENT ROUTES
// ----------------------------------------

router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ departments: departments || [] });
  } catch (error) {
    console.error('Fetch departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/departments', [
  body('name').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const department = await Department.create(req.body);
    res.status(201).json({ message: 'Department created successfully', department });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.patch('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const department = await Department.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ message: 'Department updated successfully', department });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ----------------------------------------
// PROGRAM ROUTES
// ----------------------------------------

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

    const program = await Program.create(req.body);

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

    const program = await Program.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true }
    );

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json({ message: 'Program updated successfully', program });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Failed to update program' });
  }
});

router.delete('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const program = await Program.findByIdAndDelete(id);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

export default router;
