import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/generate/:programId', requireRole(['admin']), async (req, res) => {
  try {
    const { programId } = req.params;
    const { quota_percentages = { merit: 80, quota: 10, self_finance: 10 } } = req.body;

    const { data: program } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const { data: applications } = await supabase
      .from('applications')
      .select(`
        *,
        student:student_id (full_name, email, cnic, academic_records)
      `)
      .eq('program_id', programId)
      .eq('status', 'pending');

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

    await supabase.from('merit_list').delete().eq('program_id', programId);

    const { data: insertedMeritList, error } = await supabase
      .from('merit_list')
      .insert(meritList)
      .select();

    if (error) throw error;

    for (const entry of meritList.filter(e => e.status === 'selected')) {
      await supabase
        .from('applications')
        .update({ 
          status: 'approved', 
          admission_category: entry.category,
          merit_rank: entry.rank 
        })
        .eq('id', entry.application_id);
    }

    for (const entry of meritList.filter(e => e.status === 'waitlisted')) {
      await supabase
        .from('applications')
        .update({ 
          status: 'waitlisted', 
          merit_rank: entry.rank 
        })
        .eq('id', entry.application_id);
    }

    res.json({
      message: 'Merit list generated successfully',
      program: program.name,
      totalApplications: applications.length,
      selected: meritList.filter(e => e.status === 'selected').length,
      waitlisted: meritList.filter(e => e.status === 'waitlisted').length,
      meritList: insertedMeritList
    });
  } catch (error) {
    console.error('Generate merit list error:', error);
    res.status(500).json({ error: 'Failed to generate merit list' });
  }
});

router.get('/program/:programId', async (req, res) => {
  try {
    const { programId } = req.params;
    const { category } = req.query;

    let query = supabase
      .from('merit_list')
      .select(`
        *,
        student:student_id (full_name, email, cnic),
        program:program_id (name, department)
      `)
      .eq('program_id', programId)
      .order('rank', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: meritList, error } = await query;

    if (error) throw error;

    res.json({ meritList });
  } catch (error) {
    console.error('Fetch merit list error:', error);
    res.status(500).json({ error: 'Failed to fetch merit list' });
  }
});

router.get('/student/my-position', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: meritEntries, error } = await supabase
      .from('merit_list')
      .select(`
        *,
        program:program_id (name, department, total_seats)
      `)
      .eq('student_id', userId)
      .order('generated_at', { ascending: false });

    if (error) throw error;

    res.json({ meritEntries });
  } catch (error) {
    console.error('Fetch student merit position error:', error);
    res.status(500).json({ error: 'Failed to fetch merit position' });
  }
});

router.get('/all', requireRole(['admin']), async (req, res) => {
  try {
    const { data: meritLists, error } = await supabase
      .from('merit_list')
      .select(`
        *,
        student:student_id (full_name, email, cnic),
        program:program_id (name, department)
      `)
      .order('generated_at', { ascending: false });

    if (error) throw error;

    res.json({ meritLists });
  } catch (error) {
    console.error('Fetch all merit lists error:', error);
    res.status(500).json({ error: 'Failed to fetch merit lists' });
  }
});

export default router;
