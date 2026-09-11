import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken, requireRole, getDepartmentFilter, isMainAdmin } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Program from '../models/Program.js';

const router = express.Router();

router.use(authenticateToken);

// Helper function to resolve Program by ObjectId OR by Name
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

// 1. Configure Program Fee & Deadline (Admin)
router.post('/program-fee/:programId', requireRole(['admin', 'department_admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { admission_fee, tuition_fee, bank_name, account_number, account_title, fee_deadline } = req.body;

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    // Department admin: verify program belongs to their department
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);
    if (!mainAdmin && deptFilter && program.department !== deptFilter.department) {
      return res.status(403).json({ error: 'Access denied: program not in your department' });
    }

    if (admission_fee !== undefined) program.admission_fee = Number(admission_fee);
    if (tuition_fee !== undefined) program.tuition_fee = Number(tuition_fee);
    program.total_fee = (program.admission_fee || 0) + (program.tuition_fee || 0);
    if (bank_name) program.bank_name = bank_name;
    if (account_number) program.account_number = account_number;
    if (account_title) program.account_title = account_title;
    if (fee_deadline) program.fee_deadline = new Date(fee_deadline);

    await program.save();

    res.json({ message: 'Program fee configuration updated', program });
  } catch (error) {
    console.error('Update program fee error:', error);
    res.status(500).json({ error: 'Failed to update program fee details' });
  }
});

// 2. Generate 1st Merit List (Admin)
router.post('/generate/:programId', requireRole(['admin', 'department_admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { fee_deadline, minimum_merit } = req.body;

    // Validate minimum_merit is provided and valid
    const parsedMerit = parseFloat(minimum_merit);
    if (minimum_merit === undefined || minimum_merit === null || minimum_merit === '' || isNaN(parsedMerit) || parsedMerit < 0 || parsedMerit > 100) {
      return res.status(400).json({ error: 'Please enter a valid minimum merit percentage (0-100) before generating the merit list.' });
    }

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    // Department admin: verify program belongs to their department
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);
    if (!mainAdmin && deptFilter && program.department !== deptFilter.department) {
      return res.status(403).json({ error: 'Access denied: program not in your department' });
    }

    // Prevent regeneration if a merit list already exists — require reset first
    if (program.current_merit_list >= 1) {
      return res.status(400).json({ error: 'A merit list already exists for this program. Please reset merit lists before generating a new 1st list.' });
    }

    if (fee_deadline) {
      program.fee_deadline = new Date(fee_deadline);
    }
    program.current_merit_list = 1;
    await program.save();

    // Fetch only pending applications (not yet evaluated)
    const applications = await Application.find({
      program_id: program._id,
      status: 'pending'
    }).populate('user_id', 'full_name email cnic phone');

    if (!applications || applications.length === 0) {
      return res.status(400).json({ error: 'No pending applications found for this program' });
    }

    const scoredApplications = applications.map(app => {
      const fsc = app.fsc_percentage || 0;
      return {
        app,
        calculated_score: Math.round(fsc * 100) / 100,
        academic_percentage: fsc
      };
    });

    // Apply minimum merit threshold (required)
    const filteredApplications = scoredApplications.filter(item => item.calculated_score >= parsedMerit);
    filteredApplications.sort((a, b) => b.calculated_score - a.calculated_score);

    // Select up to total program seats
    const totalSeats = program.total_seats || 50;
    const selectedApps = filteredApplications.slice(0, totalSeats);

    const defaultDeadline = program.fee_deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const meritList = [];

    for (let i = 0; i < selectedApps.length; i++) {
      const item = selectedApps[i];
      const app = item.app;
      const challanNum = `CHL-${program.name.substring(0, 3).toUpperCase()}-${app._id.toString().slice(-6).toUpperCase()}`;

      await Application.findByIdAndUpdate(app._id, {
        status: 'approved',
        merit_list_number: 1,
        fee_deadline: defaultDeadline,
        fee_challan: {
          challan_number: challanNum,
          amount: program.total_fee || 80000,
          fee_deadline: defaultDeadline
        },
        remarks: `Rank: ${i + 1}, Score: ${item.calculated_score}%`
      });

      meritList.push({
        id: app._id,
        application_id: app._id,
        student: app.user_id,
        student_id: app.user_id?._id || app.user_id,
        program_id: program._id,
        rank: i + 1,
        score: item.calculated_score,
        academic_percentage: item.academic_percentage,
        status: 'selected',
        fee_status: app.fee_status || 'unpaid',
        fee_deadline: defaultDeadline,
        generated_at: new Date().toISOString()
      });
    }

    res.json({
      message: '1st Merit list generated successfully',
      program: program.name,
      meritListNumber: 1,
      totalApplications: applications.length,
      qualifiedApplications: filteredApplications.length,
      selected: meritList.length,
      fee_deadline: defaultDeadline,
      meritList
    });
  } catch (error) {
    console.error('Generate merit list error:', error);
    res.status(500).json({ error: 'Failed to generate merit list: ' + error.message });
  }
});

// 3. Generate Next (2nd / 3rd) Merit List (Admin)
// Excludes students already selected in previous merit lists for this program.
// Selects new eligible students up to remaining seats.
// Limited to a maximum of 3 merit lists per program.
router.post('/generate-next/:programId', requireRole(['admin', 'department_admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { fee_deadline, minimum_merit } = req.body;

    // Validate minimum_merit is provided and valid
    const parsedMerit = parseFloat(minimum_merit);
    if (minimum_merit === undefined || minimum_merit === null || minimum_merit === '' || isNaN(parsedMerit) || parsedMerit < 0 || parsedMerit > 100) {
      return res.status(400).json({ error: 'Please enter a valid minimum merit percentage (0-100) before generating the merit list.' });
    }

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    // Department admin: verify program belongs to their department
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);
    if (!mainAdmin && deptFilter && program.department !== deptFilter.department) {
      return res.status(403).json({ error: 'Access denied: program not in your department' });
    }

    // Enforce maximum of 3 merit lists per program
    const currentList = program.current_merit_list || 0;
    if (currentList >= 3) {
      return res.status(400).json({ error: 'Maximum of 3 merit lists have already been generated for this program. Please reset merit lists to start over.' });
    }
    if (currentList < 1) {
      return res.status(400).json({ error: 'No merit list has been generated yet. Please generate the 1st merit list first.' });
    }

    const nextListNum = currentList + 1;
    const newDeadline = fee_deadline ? new Date(fee_deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 1. Find ALL user_ids already selected in ANY previous merit list for this program
    const previouslySelectedUserIds = await Application.distinct('user_id', {
      program_id: program._id,
      merit_list_number: { $ne: null, $lte: currentList }
    });
    const previouslySelectedSet = new Set(previouslySelectedUserIds.map(id => id.toString()));

    // 2. Find ALL applications for this program that are NOT yet in any merit list
    //    These are candidates for the next list (pending + any other non-merit-listed)
    const candidateApplications = await Application.find({
      program_id: program._id,
      merit_list_number: null
    }).populate('user_id', 'full_name email cnic phone');

    // 3. Calculate remaining seats
    const totalSeats = program.total_seats || 50;
    const previouslySelectedCount = previouslySelectedUserIds.length;
    const remainingSeats = Math.max(0, totalSeats - previouslySelectedCount);

    if (remainingSeats <= 0) {
      return res.status(400).json({ error: 'All program seats have been filled. No remaining seats for additional merit lists.' });
    }

    // 4. Score and filter candidates
    const scoredCandidates = candidateApplications.map(app => {
      const fsc = app.fsc_percentage || 0;
      return {
        app,
        calculated_score: Math.round(fsc * 100) / 100,
        academic_percentage: fsc
      };
    });

    // Apply minimum merit threshold
    const qualifiedCandidates = scoredCandidates.filter(item => item.calculated_score >= parsedMerit);
    qualifiedCandidates.sort((a, b) => b.calculated_score - a.calculated_score);

    // 5. Select top candidates up to remaining seats
    const selectedCandidates = qualifiedCandidates.slice(0, remainingSeats);

    // 6. Update program
    program.current_merit_list = nextListNum;
    program.fee_deadline = newDeadline;
    await program.save();

    // 7. Update selected applications
    let promotedCount = 0;
    for (const item of selectedCandidates) {
      const app = item.app;
      const challanNum = `CHL-${program.name.substring(0, 3).toUpperCase()}-${app._id.toString().slice(-6).toUpperCase()}`;

      app.status = 'approved';
      app.merit_list_number = nextListNum;
      app.fee_deadline = newDeadline;
      app.fee_challan = {
        challan_number: challanNum,
        amount: program.total_fee || 80000,
        fee_deadline: newDeadline
      };
      app.remarks = `Rank: ${promotedCount + 1}, Score: ${item.calculated_score}% | Selected in Merit List #${nextListNum}`;
      await app.save();
      promotedCount++;
    }

    const getOrdinal = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    res.json({
      message: `${getOrdinal(nextListNum)} Merit List generated successfully`,
      program: program.name,
      meritListNumber: nextListNum,
      totalSeats,
      previouslySelected: previouslySelectedCount,
      remainingSeats,
      totalCandidates: candidateApplications.length,
      qualifiedCandidates: qualifiedCandidates.length,
      selected: promotedCount,
      seatsLeftAfter: Math.max(0, remainingSeats - promotedCount),
      new_fee_deadline: newDeadline
    });
  } catch (error) {
    console.error('Generate next merit list error:', error);
    res.status(500).json({ error: 'Failed to generate next merit list: ' + error.message });
  }
});

// 3b. Reset Merit Lists for a Program (Admin)
// Resets all application statuses back to pending and sets current_merit_list to 0
router.post('/reset-merit/:programId', requireRole(['admin', 'department_admin']), async (req, res) => {
  try {
    const { programId } = req.params;

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    // Department admin: verify program belongs to their department
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);
    if (!mainAdmin && deptFilter && program.department !== deptFilter.department) {
      return res.status(403).json({ error: 'Access denied: program not in your department' });
    }

    // Reset all applications for this program back to pending
    await Application.updateMany(
      { program_id: program._id, status: { $in: ['approved', 'confirmed', 'waitlisted', 'dropped'] } },
      {
        $set: {
          status: 'pending',
          merit_list_number: null,
          fee_status: 'unpaid',
          fee_deadline: null,
          remarks: null
        }
      }
    );

    // Reset the program merit list counter
    program.current_merit_list = 0;
    await program.save();

    res.json({
      message: `Merit lists for ${program.name} have been reset. You can now generate the 1st merit list again.`,
      program: program.name
    });
  } catch (error) {
    console.error('Reset merit list error:', error);
    res.status(500).json({ error: 'Failed to reset merit lists: ' + error.message });
  }
});

// 4. Get Student's Fee Challan(s) (Student)
router.get('/my-fee-challan', async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({
      user_id: userId,
      status: { $in: ['approved', 'confirmed', 'waitlisted', 'dropped'] }
    }).populate('program_id', 'name department total_seats admission_fee tuition_fee total_fee bank_name account_number account_title fee_deadline')
      .populate('user_id', 'full_name email cnic phone address father_name');

    const challans = applications.map(app => {
      const prog = app.program_id;
      const user = app.user_id;

      const challanNum = app.fee_challan?.challan_number || `CHL-${prog?.name?.substring(0, 3).toUpperCase() || 'ADM'}-${app._id.toString().slice(-6).toUpperCase()}`;
      const feeDeadline = app.fee_deadline || prog?.fee_deadline || app.fee_challan?.fee_deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      return {
        application_id: app._id,
        program_id: prog?._id,
        program_name: prog?.name,
        department: prog?.department,
        status: app.status, // approved, confirmed, waitlisted, dropped
        fee_status: app.fee_status, // unpaid, submitted, verified, rejected
        merit_list_number: app.merit_list_number || 1,
        student: {
          full_name: user?.full_name,
          email: user?.email,
          cnic: user?.cnic,
          phone: user?.phone,
          father_name: user?.father_name,
          address: user?.address
        },
        challan: {
          challan_number: challanNum,
          issue_date: app.updated_at || app.created_at,
          due_date: feeDeadline,
          admission_fee: prog?.admission_fee || 15000,
          tuition_fee: prog?.tuition_fee || 65000,
          total_fee: prog?.total_fee || app.fee_challan?.amount || 80000,
          bank_name: prog?.bank_name || 'Habib Bank Limited (HBL)',
          account_number: prog?.account_number || 'PK78HABB00012345678901',
          account_title: prog?.account_title || 'University Admission Office',
          paid_receipt_url: app.fee_challan?.paid_receipt_url || null,
          uploaded_at: app.fee_challan?.uploaded_at || null,
          verified_at: app.fee_challan?.verified_at || null
        }
      };
    });

    res.json({ challans });
  } catch (error) {
    console.error('Fetch student fee challan error:', error);
    res.status(500).json({ error: 'Failed to fetch fee challan' });
  }
});

// 5. Upload Paid Fee Receipt (Student)
router.post('/upload-paid-challan/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { receipt_url, filename } = req.body;
    const userId = req.user.id;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.user_id.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to application' });
    }

    if (application.status !== 'approved' && application.status !== 'confirmed') {
      return res.status(400).json({ error: 'Fee payment is only allowed for selected applicants' });
    }

    application.fee_status = 'submitted';
    application.fee_challan.paid_receipt_url = receipt_url || 'https://via.placeholder.com/600x800.png?text=Paid+Fee+Challan+Receipt';
    application.fee_challan.filename = filename || 'paid_challan.pdf';
    application.fee_challan.uploaded_at = new Date();

    await application.save();

    res.json({
      message: 'Paid fee receipt submitted successfully! Admin will verify your payment.',
      application
    });
  } catch (error) {
    console.error('Upload paid challan error:', error);
    res.status(500).json({ error: 'Failed to upload paid fee challan' });
  }
});

// 6. Verify Fee Payment (Admin)
router.patch('/verify-fee/:applicationId', requireRole(['admin', 'department_admin']), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action } = req.body; // 'verify' or 'reject'

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Department admin: verify application belongs to their department
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);
    if (!mainAdmin && deptFilter) {
      const program = await Program.findById(application.program_id);
      if (!program || program.department !== deptFilter.department) {
        return res.status(403).json({ error: 'Access denied: application not in your department' });
      }
    }

    if (action === 'verify') {
      application.fee_status = 'verified';
      application.status = 'confirmed';
      application.fee_challan.verified_at = new Date();
      application.fee_challan.verified_by = req.user.id;
      application.remarks += ' | Fee Payment Verified & Admission Confirmed.';
    } else {
      application.fee_status = 'rejected';
      application.remarks += ' | Fee Receipt Rejected by Admin.';
    }

    await application.save();

    res.json({
      message: action === 'verify' ? 'Fee payment verified & admission confirmed!' : 'Fee payment marked as rejected.',
      application
    });
  } catch (error) {
    console.error('Verify fee error:', error);
    res.status(500).json({ error: 'Failed to verify fee payment' });
  }
});

// 7. Get Merit List for Program (Public / Admin / Student)
router.get('/program/:programId', async (req, res) => {
  try {
    const { programId } = req.params;
    const { category, list } = req.query;

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    // Build query: filter by specific merit_list_number if `list` param provided
    const query = {
      program_id: program._id,
      status: { $in: ['approved', 'confirmed', 'waitlisted', 'dropped'] }
    };
    if (list && list !== 'all') {
      const listNum = parseInt(list, 10);
      if (!isNaN(listNum) && listNum >= 1) {
        query.merit_list_number = listNum;
      }
    }

    const applications = await Application.find(query).populate('user_id', 'full_name email cnic phone');

    const scoredApps = applications.map(app => {
      const fsc = app.fsc_percentage || 0;

      const cat = 'merit';

      return {
        app,
        score: Math.round(fsc * 100) / 100,
        category: cat
      };
    });

    scoredApps.sort((a, b) => b.score - a.score);

    let filtered = scoredApps;
    if (category && category !== 'all') {
      filtered = scoredApps.filter(item => item.category === category);
    }

    const defaultDeadline = program.fee_deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const meritList = filtered.map((item, index) => ({
      id: item.app._id,
      rank: index + 1,
      student: item.app.user_id,
      student_id: item.app.user_id?._id || item.app.user_id,
      program_id: program._id,
      status: item.app.status === 'confirmed' ? 'confirmed' : (item.app.status === 'approved' ? 'selected' : item.app.status),
      fee_status: item.app.fee_status || 'unpaid',
      fee_receipt_url: item.app.fee_challan?.paid_receipt_url || null,
      merit_list_number: item.app.merit_list_number || program.current_merit_list || 1,
      score: item.score,
      category: item.category,
      remarks: item.app.remarks
    }));

    res.json({
      program: {
        id: program._id,
        name: program.name,
        department: program.department,
        total_seats: program.total_seats,
        current_merit_list: program.current_merit_list || 1,
        fee_deadline: defaultDeadline,
        admission_fee: program.admission_fee || 15000,
        tuition_fee: program.tuition_fee || 65000,
        total_fee: program.total_fee || 80000,
        bank_name: program.bank_name || 'Habib Bank Limited (HBL)',
        account_number: program.account_number || 'PK78HABB00012345678901',
        account_title: program.account_title || 'University Admission Office'
      },
      meritList
    });
  } catch (error) {
    console.error('Fetch merit list error:', error);
    res.status(500).json({ error: 'Failed to fetch merit list: ' + error.message });
  }
});

// 8. Student Position Tracking
router.get('/student/my-position', async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({
      user_id: userId,
      status: { $in: ['approved', 'confirmed', 'waitlisted', 'dropped'] }
    }).populate('program_id', 'name department total_seats fee_deadline')
      .sort({ created_at: -1 });

    const meritEntries = applications.map((app, index) => {
      const fsc = app.fsc_percentage || 0;

      return {
        id: app._id,
        rank: index + 1,
        student_id: app.user_id,
        program_id: app.program_id,
        status: app.status === 'approved' ? 'selected' : app.status,
        fee_status: app.fee_status || 'unpaid',
        fee_deadline: app.fee_deadline || app.program_id?.fee_deadline,
        score: Math.round(fsc * 100) / 100
      };
    });

    res.json({ meritEntries });
  } catch (error) {
    console.error('Fetch student merit position error:', error);
    res.status(500).json({ error: 'Failed to fetch merit position' });
  }
});

// 9. All Merit Lists (Admin)
router.get('/all', requireRole(['admin', 'department_admin']), async (req, res) => {
  try {
    const deptFilter = getDepartmentFilter(req);
    const mainAdmin = isMainAdmin(req);

    // Build filter for department admin
    const filter = { status: { $in: ['approved', 'confirmed', 'waitlisted', 'dropped'] } };
    if (!mainAdmin && deptFilter) {
      const deptPrograms = await Program.find({ department: deptFilter.department }).select('_id');
      filter.program_id = { $in: deptPrograms.map(p => p._id) };
    }

    const applications = await Application.find(filter)
      .populate('user_id', 'full_name email cnic')
      .populate('program_id', 'name department')
      .sort({ created_at: -1 });

    const meritLists = applications.map((app, index) => {
      const fsc = app.fsc_percentage || 0;

      return {
        id: app._id,
        student: app.user_id,
        student_id: app.user_id,
        program_id: app.program_id,
        status: app.status === 'approved' ? 'selected' : app.status,
        fee_status: app.fee_status || 'unpaid',
        fee_receipt_url: app.fee_challan?.paid_receipt_url || null,
        rank: index + 1,
        score: Math.round(fsc * 100) / 100,
        generated_at: app.created_at
      };
    });

    res.json({ meritLists });
  } catch (error) {
    console.error('Fetch all merit lists error:', error);
    res.status(500).json({ error: 'Failed to fetch merit lists' });
  }
});

export default router;
