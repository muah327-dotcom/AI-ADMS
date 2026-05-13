import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Program from '../models/Program.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/generate/:programId', requireRole(['admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { quota_percentages = { merit: 80, quota: 10, self_finance: 10 } } = req.body;

    const program = await Program.findById(programId);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const applications = await Application.find({
      program_id: programId,
      status: 'pending'
    }).populate('user_id', 'full_name email cnic phone');

    if (!applications || applications.length === 0) {
      return res.status(400).json({ error: 'No pending applications found for this program' });
    }

    const scoredApplications = applications.map(app => {
      const academicRecords = app.student?.academic_records || {};
      const percentage = academicRecords.percentage || 0;
      const subjectScores = academicRecords.subject_scores || {};
      const extracurricularBonus = app.extracurriculars ? 5 : 0;
      
      const subjectAvg = Object.values(subjectScores).reduce((a, b) => a + b, 0) / 
        (Object.values(subjectScores).length || 1);
      
      const totalScore = (percentage * 0.7) + (subjectAvg * 0.3) + extracurricularBonus;
      
      return {
        ...app,
        calculated_score: totalScore,
        academic_percentage: percentage
      };
    });

    scoredApplications.sort((a, b) => b.calculated_score - a.calculated_score);

    const meritSeats = Math.floor(program.total_seats * quota_percentages.merit / 100);
    const quotaSeats = Math.floor(program.total_seats * quota_percentages.quota / 100);
    const selfFinanceSeats = program.total_seats - meritSeats - quotaSeats;

    const meritList = [];
    let currentRank = 1;

    for (let i = 0; i < scoredApplications.length && i < program.total_seats; i++) {
      const app = scoredApplications[i];
      let category = 'merit';
      
      if (i >= meritSeats && i < meritSeats + quotaSeats) {
        category = 'quota';
      } else if (i >= meritSeats + quotaSeats) {
        category = 'self_finance';
      }

      meritList.push({
        application_id: app.id,
        student_id: app.student_id,
        program_id: programId,
        rank: currentRank++,
        score: app.calculated_score,
        category,
        academic_percentage: app.academic_percentage,
        status: i < program.total_seats ? 'selected' : 'waitlisted',
        generated_at: new Date().toISOString()
      });
    }

    // Update applications directly based on merit list
    for (const entry of meritList.filter(e => e.status === 'selected')) {
      await Application.findByIdAndUpdate(
        entry.application_id,
        { 
          status: 'approved',
          remarks: `Selected via ${entry.category} category, Rank: ${entry.rank}`
        }
      );
    }

    for (const entry of meritList.filter(e => e.status === 'waitlisted')) {
      await Application.findByIdAndUpdate(
        entry.application_id,
        { 
          status: 'waitlisted',
          remarks: `Waitlisted, Rank: ${entry.rank}`
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
    res.status(500).json({ error: 'Failed to generate merit list' });
  }
});

router.get('/program/:programId', async (req, res) => {
  try {
    const { programId } = req.params;

    // Get approved applications for this program as merit list
    const applications = await Application.find({
      program_id: programId,
      status: { $in: ['approved', 'waitlisted'] }
    }).populate('user_id', 'full_name email cnic')
      .sort({ created_at: -1 });

    const meritList = applications.map((app, index) => ({
      id: app._id,
      rank: index + 1,
      student_id: app.user_id,
      program_id: app.program_id,
      status: app.status,
      score: (app.matric_percentage + app.fsc_percentage) / 2
    }));

    res.json({ meritList });
  } catch (error) {
    console.error('Fetch merit list error:', error);
    res.status(500).json({ error: 'Failed to fetch merit list' });
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

    const meritEntries = applications.map((app, index) => ({
      id: app._id,
      rank: index + 1,
      student_id: app.user_id,
      program_id: app.program_id,
      status: app.status,
      score: (app.matric_percentage + app.fsc_percentage) / 2
    }));

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

    const meritLists = applications.map((app, index) => ({
      id: app._id,
      student_id: app.user_id,
      program_id: app.program_id,
      status: app.status,
      rank: index + 1,
      score: (app.matric_percentage + app.fsc_percentage) / 2,
      generated_at: app.created_at
    }));

    res.json({ meritLists });
  } catch (error) {
    console.error('Fetch all merit lists error:', error);
    res.status(500).json({ error: 'Failed to fetch merit lists' });
  }
});

export default router;
