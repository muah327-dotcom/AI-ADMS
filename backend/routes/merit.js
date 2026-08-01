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

router.post('/generate/:programId', requireRole(['admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { quota_percentages = { merit: 80, quota: 10, self_finance: 10 } } = req.body;

    const program = await findProgram(programId);

    if (!program) {
      return res.status(404).json({ error: `Program '${programId}' not found` });
    }

    let applications = await Application.find({
      program_id: program._id,
      status: 'pending'
    }).populate('user_id', 'full_name email cnic phone');

    // Fallback: If no pending applications, re-evaluate approved & waitlisted applications for regeneration
    if (!applications || applications.length === 0) {
      applications = await Application.find({
        program_id: program._id,
        status: { $in: ['approved', 'waitlisted'] }
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

    const meritList = [];
    let currentRank = 1;

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
      const status = isSelected ? 'selected' : 'waitlisted';

      meritList.push({
        id: app._id,
        application_id: app._id,
        student: app.user_id,
        student_id: app.user_id?._id || app.user_id,
        program_id: program._id,
        rank: currentRank++,
        score: item.calculated_score,
        category,
        academic_percentage: item.academic_percentage,
        status,
        generated_at: new Date().toISOString()
      });
    }

    // Update applications directly based on merit list
    for (const entry of meritList) {
      await Application.findByIdAndUpdate(
        entry.application_id,
        { 
          status: entry.status === 'selected' ? 'approved' : 'waitlisted',
          remarks: `Category: ${entry.category}, Rank: ${entry.rank}, Score: ${entry.score}%`
        }
      );
    }

    res.json({
      message: 'Merit list generated successfully',
      program: program.name,
      totalApplications: applications.length,
      selected: meritList.filter(e => e.status === 'selected').length,
      waitlisted: meritList.filter(e => e.status === 'waitlisted').length,
      meritList
    });
  } catch (error) {
    console.error('Generate merit list error:', error);
    res.status(500).json({ error: 'Failed to generate merit list: ' + error.message });
  }
});

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
      status: { $in: ['approved', 'waitlisted'] }
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

    const meritList = filtered.map((item, index) => ({
      id: item.app._id,
      rank: index + 1,
      student: item.app.user_id,
      student_id: item.app.user_id?._id || item.app.user_id,
      program_id: program._id,
      status: item.app.status === 'approved' ? 'selected' : 'waitlisted',
      score: item.score,
      category: item.category,
      remarks: item.app.remarks
    }));

    res.json({ meritList });
  } catch (error) {
    console.error('Fetch merit list error:', error);
    res.status(500).json({ error: 'Failed to fetch merit list: ' + error.message });
  }
});

router.get('/student/my-position', async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({
      user_id: userId,
      status: { $in: ['approved', 'waitlisted'] }
    }).populate('program_id', 'name department total_seats')
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
        score: Math.round(score * 100) / 100
      };
    });

    res.json({ meritEntries });
  } catch (error) {
    console.error('Fetch student merit position error:', error);
    res.status(500).json({ error: 'Failed to fetch merit position' });
  }
});

router.get('/all', requireRole(['admin']), async (req, res) => {
  try {
    const applications = await Application.find({
      status: { $in: ['approved', 'waitlisted'] }
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
