import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken, requireRole } from '../middleware/auth.js';
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
router.post('/program-fee/:programId', requireRole(['admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { admission_fee, tuition_fee, bank_name, account_number, account_title, fee_deadline } = req.body;

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
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
router.post('/generate/:programId', requireRole(['admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { quota_percentages = { merit: 80, quota: 10, self_finance: 10 }, fee_deadline } = req.body;

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    if (fee_deadline) {
      program.fee_deadline = new Date(fee_deadline);
    }
    program.current_merit_list = 1;
    await program.save();

    let applications = await Application.find({
      program_id: program._id,
      status: 'pending'
    }).populate('user_id', 'full_name email cnic phone');

    // Fallback: If no pending applications, re-evaluate approved, waitlisted, confirmed, dropped
    if (!applications || applications.length === 0) {
      applications = await Application.find({
        program_id: program._id,
        status: { $in: ['approved', 'waitlisted', 'confirmed', 'dropped'] }
      }).populate('user_id', 'full_name email cnic phone');
    }

    if (!applications || applications.length === 0) {
      return res.status(400).json({ error: 'No applications found for this program' });
    }

    const scoredApplications = applications.map(app => {
      const fsc = app.fsc_percentage || 0;
      const matric = app.matric_percentage || fsc;
      const entryTest = app.entry_test_marks || 0;

      let totalScore = 0;
      if (entryTest > 0) {
        totalScore = (fsc * 0.5) + (entryTest * 0.3) + (matric * 0.2);
      } else {
        totalScore = (fsc * 0.7) + (matric * 0.3);
      }

      return {
        app,
        calculated_score: Math.round(totalScore * 100) / 100,
        academic_percentage: fsc
      };
    });

    scoredApplications.sort((a, b) => b.calculated_score - a.calculated_score);

    const totalSeats = program.total_seats || 50;
    const meritSeats = Math.floor(totalSeats * (quota_percentages.merit || 80) / 100);
    const quotaSeats = Math.floor(totalSeats * (quota_percentages.quota || 10) / 100);

    const defaultDeadline = program.fee_deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const meritList = [];

    for (let i = 0; i < scoredApplications.length; i++) {
      const item = scoredApplications[i];
      const app = item.app;
      let category = 'merit';

      if (i >= meritSeats && i < meritSeats + quotaSeats) {
        category = 'quota';
      } else if (i >= meritSeats + quotaSeats) {
        category = 'self_finance';
      }

      const isSelected = i < totalSeats;
      const status = isSelected ? 'approved' : 'waitlisted';
      const challanNum = `CHL-${program.name.substring(0, 3).toUpperCase()}-${app._id.toString().slice(-6).toUpperCase()}`;

      await Application.findByIdAndUpdate(app._id, {
        status,
        merit_list_number: 1,
        fee_deadline: isSelected ? defaultDeadline : null,
        fee_challan: {
          challan_number: challanNum,
          amount: program.total_fee || 80000,
          fee_deadline: defaultDeadline
        },
        remarks: `Category: ${category}, Rank: ${i + 1}, Score: ${item.calculated_score}%`
      });

      meritList.push({
        id: app._id,
        application_id: app._id,
        student: app.user_id,
        student_id: app.user_id?._id || app.user_id,
        program_id: program._id,
        rank: i + 1,
        score: item.calculated_score,
        category,
        academic_percentage: item.academic_percentage,
        status: isSelected ? 'selected' : 'waitlisted',
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
      selected: meritList.filter(e => e.status === 'selected').length,
      waitlisted: meritList.filter(e => e.status === 'waitlisted').length,
      fee_deadline: defaultDeadline,
      meritList
    });
  } catch (error) {
    console.error('Generate merit list error:', error);
    res.status(500).json({ error: 'Failed to generate merit list: ' + error.message });
  }
});

// 3. Generate Next (2nd / 3rd) Merit List (Admin)
// Drops unpaid students whose deadline has passed & promotes waitlisted students into vacant seats
router.post('/generate-next/:programId', requireRole(['admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { fee_deadline } = req.body;

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    const nextListNum = (program.current_merit_list || 1) + 1;
    const newDeadline = fee_deadline ? new Date(fee_deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    program.current_merit_list = nextListNum;
    program.fee_deadline = newDeadline;
    await program.save();

    // 1. Find all selected ('approved') students for this program
    const approvedApps = await Application.find({
      program_id: program._id,
      status: 'approved'
    });

    let droppedCount = 0;
    // Auto-drop approved students who are still unpaid / rejected fee
    for (const app of approvedApps) {
      if (app.fee_status === 'unpaid' || app.fee_status === 'rejected') {
        app.status = 'dropped';
        app.remarks += ` | Dropped in List #${nextListNum} due to non-payment of fee.`;
        await app.save();
        droppedCount++;
      }
    }

    // 2. Count confirmed students
    const confirmedCount = await Application.countDocuments({
      program_id: program._id,
      status: 'confirmed'
    });

    // Count still active approved students (e.g. submitted fee pending verification)
    const activeApprovedCount = await Application.countDocuments({
      program_id: program._id,
      status: 'approved'
    });

    const vacantSeats = (program.total_seats || 50) - (confirmedCount + activeApprovedCount);

    let promotedCount = 0;
    if (vacantSeats > 0) {
      // Find top waitlisted applicants sorted by score (re-evaluate score)
      const waitlistedApps = await Application.find({
        program_id: program._id,
        status: 'waitlisted'
      }).populate('user_id', 'full_name email cnic');

      const scoredWaitlisted = waitlistedApps.map(app => {
        const fsc = app.fsc_percentage || 0;
        const matric = app.matric_percentage || fsc;
        const entryTest = app.entry_test_marks || 0;
        const score = entryTest > 0 ? (fsc * 0.5 + entryTest * 0.3 + matric * 0.2) : (fsc * 0.7 + matric * 0.3);
        return { app, score };
      }).sort((a, b) => b.score - a.score);

      const appsToPromote = scoredWaitlisted.slice(0, vacantSeats);

      for (const item of appsToPromote) {
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
        app.remarks += ` | Promoted to Selected in Merit List #${nextListNum}`;
        await app.save();
        promotedCount++;
      }
    }

    res.json({
      message: `${nextListNum}${nextListNum === 2 ? 'nd' : 'rd'} Merit List generated successfully`,
      program: program.name,
      meritListNumber: nextListNum,
      droppedUnpaidCount: droppedCount,
      confirmedCount,
      promotedWaitlistedCount: promotedCount,
      vacantSeatsLeft: Math.max(0, vacantSeats - promotedCount),
      new_fee_deadline: newDeadline
    });
  } catch (error) {
    console.error('Generate next merit list error:', error);
    res.status(500).json({ error: 'Failed to generate next merit list: ' + error.message });
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
router.patch('/verify-fee/:applicationId', requireRole(['admin']), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action } = req.body; // 'verify' or 'reject'

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
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
    const { category } = req.query;

    const program = await findProgram(programId);
    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    const applications = await Application.find({
      program_id: program._id,
      status: { $in: ['approved', 'confirmed', 'waitlisted', 'dropped'] }
    }).populate('user_id', 'full_name email cnic phone');

    const scoredApps = applications.map(app => {
      const fsc = app.fsc_percentage || 0;
      const matric = app.matric_percentage || fsc;
      const entry = app.entry_test_marks || 0;
      let score = 0;
      if (entry > 0) {
        score = (fsc * 0.5) + (entry * 0.3) + (matric * 0.2);
      } else {
        score = (fsc * 0.7) + (matric * 0.3);
      }

      let cat = 'merit';
      if (app.remarks?.toLowerCase().includes('category: quota') || app.remarks?.toLowerCase().includes('quota')) cat = 'quota';
      else if (app.remarks?.toLowerCase().includes('category: self_finance') || app.remarks?.toLowerCase().includes('self_finance')) cat = 'self_finance';

      return {
        app,
        score: Math.round(score * 100) / 100,
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
      const matric = app.matric_percentage || fsc;
      const entry = app.entry_test_marks || 0;
      const score = entry > 0 ? (fsc * 0.5 + entry * 0.3 + matric * 0.2) : (fsc * 0.7 + matric * 0.3);

      return {
        id: app._id,
        rank: index + 1,
        student_id: app.user_id,
        program_id: app.program_id,
        status: app.status === 'approved' ? 'selected' : app.status,
        fee_status: app.fee_status || 'unpaid',
        fee_deadline: app.fee_deadline || app.program_id?.fee_deadline,
        score: Math.round(score * 100) / 100
      };
    });

    res.json({ meritEntries });
  } catch (error) {
    console.error('Fetch student merit position error:', error);
    res.status(500).json({ error: 'Failed to fetch merit position' });
  }
});

// 9. All Merit Lists (Admin)
router.get('/all', requireRole(['admin']), async (req, res) => {
  try {
    const applications = await Application.find({
      status: { $in: ['approved', 'confirmed', 'waitlisted', 'dropped'] }
    }).populate('user_id', 'full_name email cnic')
      .populate('program_id', 'name department')
      .sort({ created_at: -1 });

    const meritLists = applications.map((app, index) => {
      const fsc = app.fsc_percentage || 0;
      const matric = app.matric_percentage || fsc;
      const entry = app.entry_test_marks || 0;
      const score = entry > 0 ? (fsc * 0.5 + entry * 0.3 + matric * 0.2) : (fsc * 0.7 + matric * 0.3);

      return {
        id: app._id,
        student: app.user_id,
        student_id: app.user_id,
        program_id: app.program_id,
        status: app.status === 'approved' ? 'selected' : app.status,
        fee_status: app.fee_status || 'unpaid',
        fee_receipt_url: app.fee_challan?.paid_receipt_url || null,
        rank: index + 1,
        score: Math.round(score * 100) / 100,
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
