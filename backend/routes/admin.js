import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole, requireMainAdmin, requireAnyAdmin, getDepartmentFilter, isMainAdmin } from '../middleware/auth.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import Program from '../models/Program.js';
import Document from '../models/Document.js';
import Department from '../models/Department.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAnyAdmin);

// ============================================
// DEPARTMENT ADMIN MANAGEMENT (Main Admin Only)
// ============================================

// List all department admins
router.get('/department-admins', requireMainAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const admins = await User.find({ role: 'department_admin' })
      .select('-password')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const count = await User.countDocuments({ role: 'department_admin' });
    res.json({
      admins,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Fetch department admins error:', error);
    res.status(500).json({ error: 'Failed to fetch department admins' });
  }
});

// Create department admin
router.post('/department-admins', requireMainAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().notEmpty(),
  body('department').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, department } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      email,
      password: hashedPassword,
      full_name,
      role: 'department_admin',
      department,
      is_active: true
    });

    res.status(201).json({
      message: 'Department admin created successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        department: admin.department,
        is_active: admin.is_active,
        created_at: admin.created_at
      }
    });
  } catch (error) {
    console.error('Create department admin error:', error);
    res.status(500).json({ error: 'Failed to create department admin' });
  }
});

// Update department admin
router.patch('/department-admins/:id', requireMainAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, department, is_active } = req.body;

    const admin = await User.findById(id);
    if (!admin || admin.role !== 'department_admin') {
      return res.status(404).json({ error: 'Department admin not found' });
    }

    if (email && email !== admin.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email;
    if (department) updates.department = department;
    if (is_active !== undefined) updates.is_active = is_active;

    const updated = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');

    res.json({ message: 'Department admin updated successfully', admin: updated });
  } catch (error) {
    console.error('Update department admin error:', error);
    res.status(500).json({ error: 'Failed to update department admin' });
  }
});

// Delete department admin
router.delete('/department-admins/:id', requireMainAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findById(id);
    if (!admin || admin.role !== 'department_admin') {
      return res.status(404).json({ error: 'Department admin not found' });
    }
    await User.findByIdAndDelete(id);
    res.json({ message: 'Department admin deleted successfully' });
  } catch (error) {
    console.error('Delete department admin error:', error);
    res.status(500).json({ error: 'Failed to delete department admin' });
  }
});

// ============================================
// DASHBOARD STATS
// ============================================

router.get('/dashboard-stats', async (req, res) => {
  try {
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);

    // If department admin, get programs in their department first
    let programIds = null;
    if (!mainAdmin && deptFilter) {
      const deptPrograms = await Program.find({ department: deptFilter.department }).select('_id');
      programIds = deptPrograms.map(p => p._id);
    }

    // Build application filter based on role
    const appFilter = {};
    if (programIds) {
      appFilter.program_id = { $in: programIds };
    }

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
      Application.countDocuments(appFilter),
      Application.countDocuments({ ...appFilter, status: 'pending' }),
      Application.countDocuments({ ...appFilter, status: 'approved' }),
      Application.countDocuments({ ...appFilter, status: 'confirmed' }),
      Application.countDocuments({ ...appFilter, status: 'waitlisted' }),
      Application.countDocuments({ ...appFilter, status: 'rejected' }),
      Application.countDocuments({ ...appFilter, status: 'dropped' }),
      mainAdmin
        ? User.countDocuments({ role: 'student' })
        : User.countDocuments({ role: 'student' }), // students are global, filtered by program
      mainAdmin
        ? Program.countDocuments()
        : Program.countDocuments(deptFilter || {}),
      // Program distribution via aggregation
      (programIds
        ? Application.aggregate([
            { $match: { program_id: { $in: programIds } } },
            { $group: { _id: '$program_id', count: { $sum: 1 } } },
            { $lookup: { from: 'programs', localField: '_id', foreignField: '_id', as: 'program' } },
            { $unwind: '$program' },
            { $project: { name: '$program.name', count: 1, _id: 0 } }
          ])
        : Application.aggregate([
            { $group: { _id: '$program_id', count: { $sum: 1 } } },
            { $lookup: { from: 'programs', localField: '_id', foreignField: '_id', as: 'program' } },
            { $unwind: '$program' },
            { $project: { name: '$program.name', count: 1, _id: 0 } }
          ])
      ),
      // Category counts using regex
      Application.countDocuments({
        ...appFilter,
        status: { $in: ['approved', 'confirmed', 'waitlisted'] },
        remarks: { $regex: /quota/i }
      }),
      Application.countDocuments({
        ...appFilter,
        status: { $in: ['approved', 'confirmed', 'waitlisted'] },
        remarks: { $regex: /self_finance/i }
      })
    ]);

    const admittedCount = approved + confirmed;
    const admissionRate = total > 0 ? (admittedCount / total) * 100 : 0;
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

// ============================================
// APPLICATION MANAGEMENT
// ============================================

router.get('/all-applications', async (req, res) => {
  try {
    const { status, program, page = 1, limit = 20 } = req.query;
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);

    // Build base filter
    const baseFilter = {};
    if (!mainAdmin && deptFilter) {
      const deptPrograms = await Program.find({ department: deptFilter.department }).select('_id');
      baseFilter.program_id = { $in: deptPrograms.map(p => p._id) };
    }

    let query = Application.find(baseFilter);

    if (status && status !== 'all') {
      query = query.where('status').equals(status);
    }
    if (program && program !== 'all') {
      query = query.where('program_id').equals(program);
    }

    const [applications, count] = await Promise.all([
      query
        .populate('user_id', 'full_name email cnic phone father_name father_phone alternate_phone date_of_birth gender address permanent_address matric_passing_year matric_obtained_marks matric_total_marks inter_passing_year inter_obtained_marks inter_total_marks inter_qualification is_verified uploaded_documents avatar_url')
        .populate('program_id', 'name department min_percentage required_subjects total_seats admission_fee tuition_fee total_fee')
        .sort({ application_date: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Application.countDocuments(query.getFilter())
    ]);

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
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);

    const application = await Application.findById(id)
      .populate('user_id', 'full_name email cnic phone father_name father_phone alternate_phone date_of_birth gender address permanent_address matric_passing_year matric_obtained_marks matric_total_marks inter_passing_year inter_obtained_marks inter_total_marks inter_qualification is_verified uploaded_documents avatar_url')
      .populate('program_id', 'name department min_percentage required_subjects total_seats admission_fee tuition_fee total_fee');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Department admin: verify application belongs to their department
    if (!mainAdmin && deptFilter) {
      const program = await Program.findById(application.program_id?._id || application.program_id);
      if (!program || program.department !== deptFilter.department) {
        return res.status(403).json({ error: 'Access denied: application not in your department' });
      }
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
    const documents = await Document.find({ user_id: userId }).select('-file_data').sort({ uploaded_at: 1 });
    const user = await User.findById(userId).select('-password');
    res.json({ student: user, documents });
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
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);

    // Department admin: verify application belongs to their department
    if (!mainAdmin && deptFilter) {
      const existingApp = await Application.findById(id);
      if (!existingApp) {
        return res.status(404).json({ error: 'Application not found' });
      }
      const program = await Program.findById(existingApp.program_id);
      if (!program || program.department !== deptFilter.department) {
        return res.status(403).json({ error: 'Access denied: application not in your department' });
      }
    }

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
      .populate('user_id', 'full_name email cnic phone father_name date_of_birth gender address matric_passing_year matric_obtained_marks matric_total_marks inter_passing_year inter_obtained_marks inter_total_marks inter_qualification')
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

// ============================================
// USER/STUDENT MANAGEMENT
// ============================================

router.get('/all-users', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const students = await User.find({ role: 'student' })
      .select('full_name email cnic phone father_name date_of_birth gender address is_verified created_at uploaded_documents avatar_url')
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
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);

    // For department admin, get students who have applications in their department
    let studentIdsInDept = null;
    if (!mainAdmin && deptFilter) {
      const deptPrograms = await Program.find({ department: deptFilter.department }).select('_id');
      const deptProgramIds = deptPrograms.map(p => p._id);
      const appsInDept = await Application.find({ program_id: { $in: deptProgramIds } }).select('user_id');
      studentIdsInDept = [...new Set(appsInDept.map(a => a.user_id.toString()))];
    }

    let query = User.find({ role: 'student' });

    if (studentIdsInDept) {
      query = query.where('_id').in(studentIdsInDept);
    }

    if (category && category !== 'all') {
      query = query.where('admission_category').equals(category);
    }
    if (program && program !== 'all') {
      query = query.where('program_id').equals(program);
    }

    const baseFilter = query.getFilter();
    const baseFilterNoCategory = { ...baseFilter };
    delete baseFilterNoCategory.admission_category;

    const [students, count, meritCount, quotaCount, selfFinanceCount] = await Promise.all([
      query
        .select('full_name email cnic phone father_name date_of_birth gender address admission_category program_id is_verified created_at uploaded_documents avatar_url')
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      User.countDocuments(baseFilter),
      User.countDocuments({ ...baseFilterNoCategory, admission_category: 'merit' }),
      User.countDocuments({ ...baseFilterNoCategory, admission_category: 'quota' }),
      User.countDocuments({ ...baseFilterNoCategory, admission_category: 'self_ffinance' })
    ]);

    const studentIds = students.map(s => s._id);
    const [documents, userApplications] = await Promise.all([
      Document.find({ user_id: { $in: studentIds } }).select('-file_data').sort({ uploaded_at: 1 }),
      Application.find({ user_id: { $in: studentIds } })
        .select('user_id program_id status application_date')
        .populate('program_id', 'name department')
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
      stats: { merit: meritCount, quota: quotaCount, self_finance: selfFinanceCount },
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ============================================
// DEPARTMENT ROUTES
// ============================================

router.get('/departments', requireMainAdmin, async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ departments: departments || [] });
  } catch (error) {
    console.error('Fetch departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/departments', requireMainAdmin, [
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

router.patch('/departments/:id', requireMainAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const department = await Department.findByIdAndUpdate(id, { ...updates, updated_at: new Date() }, { new: true });
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

router.delete('/departments/:id', requireMainAdmin, async (req, res) => {
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

// ============================================
// PROGRAM ROUTES
// ============================================

router.post('/programs', [
  body('name').trim().notEmpty(),
  body('department').trim().notEmpty(),
  body('total_seats').isInt({ min: 1 }),
  body('min_percentage').isFloat({ min: 0, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Department admin: ensure program belongs to their department
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);
    if (!mainAdmin && deptFilter) {
      if (req.body.department !== deptFilter.department) {
        return res.status(403).json({ error: 'Access denied: can only create programs in your department' });
      }
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

    // Department admin: verify program belongs to their department
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);
    if (!mainAdmin && deptFilter) {
      const program = await Program.findById(id);
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      if (program.department !== deptFilter.department) {
        return res.status(403).json({ error: 'Access denied: cannot edit programs in other departments' });
      }
      // Prevent changing department to another
      if (updates.department && updates.department !== deptFilter.department) {
        return res.status(403).json({ error: 'Access denied: cannot change program to another department' });
      }
    }

    const program = await Program.findByIdAndUpdate(id, { ...updates, updated_at: new Date() }, { new: true });
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

    // Department admin: verify program belongs to their department
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);
    if (!mainAdmin && deptFilter) {
      const program = await Program.findById(id);
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      if (program.department !== deptFilter.department) {
        return res.status(403).json({ error: 'Access denied: cannot delete programs in other departments' });
      }
    }

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
