import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/admissions-by-category', async (req, res) => {
  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('admission_category, status');

    if (error) throw error;

    const categoryCounts = applications.reduce((acc, app) => {
      if (app.admission_category) {
        acc[app.admission_category] = (acc[app.admission_category] || 0) + 1;
      }
      return acc;
    }, {});

    const chartData = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: ((count / applications.length) * 100).toFixed(2)
    }));

    res.json({ 
      data: chartData,
      total: applications.length 
    });
  } catch (error) {
    console.error('Category analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch category analytics' });
  }
});

router.get('/applications-by-program', async (req, res) => {
  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        program:program_id (name)
      `);

    if (error) throw error;

    const programCounts = applications.reduce((acc, app) => {
      const programName = app.program?.name || 'Unknown';
      acc[programName] = (acc[programName] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(programCounts)
      .map(([program, count]) => ({ program, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ data: chartData });
  } catch (error) {
    console.error('Program analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch program analytics' });
  }
});

router.get('/performance-insights', async (req, res) => {
  try {
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        academic_records,
        status,
        student:student_id (full_name)
      `);

    const percentageRanges = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      'Below 60': 0
    };

    const subjectPerformance = {};

    applications.forEach(app => {
      const records = app.academic_records || {};
      const percentage = records.percentage || 0;
      const scores = records.subject_scores || {};

      if (percentage >= 90) percentageRanges['90-100']++;
      else if (percentage >= 80) percentageRanges['80-89']++;
      else if (percentage >= 70) percentageRanges['70-79']++;
      else if (percentage >= 60) percentageRanges['60-69']++;
      else percentageRanges['Below 60']++;

      Object.entries(scores).forEach(([subject, score]) => {
        if (!subjectPerformance[subject]) {
          subjectPerformance[subject] = { total: 0, count: 0 };
        }
        subjectPerformance[subject].total += score;
        subjectPerformance[subject].count += 1;
      });
    });

    const averageSubjectScores = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      average: (data.total / data.count).toFixed(2),
      totalStudents: data.count
    }));

    const chartData = Object.entries(percentageRanges).map(([range, count]) => ({
      range,
      count,
      percentage: ((count / applications.length) * 100).toFixed(2)
    }));

    res.json({
      percentageDistribution: chartData,
      subjectPerformance: averageSubjectScores,
      totalApplications: applications.length
    });
  } catch (error) {
    console.error('Performance insights error:', error);
    res.status(500).json({ error: 'Failed to fetch performance insights' });
  }
});

router.get('/monthly-trends', async (req, res) => {
  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('application_date, status');

    if (error) throw error;

    const monthlyData = applications.reduce((acc, app) => {
      const date = new Date(app.application_date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = { month: monthYear, count: 0, approved: 0, rejected: 0, pending: 0 };
      }
      
      acc[monthYear].count++;
      acc[monthYear][app.status]++;
      
      return acc;
    }, {});

    const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.json({ data: chartData });
  } catch (error) {
    console.error('Monthly trends error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly trends' });
  }
});

router.get('/seat-occupancy', async (req, res) => {
  try {
    const { data: programs, error } = await supabase
      .from('programs')
      .select(`
        id,
        name,
        total_seats,
        merit_seats,
        quota_seats,
        self_finance_seats
      `);

    if (error) throw error;

    const occupancyData = await Promise.all(programs.map(async (program) => {
      const { data: admitted } = await supabase
        .from('applications')
        .select('admission_category')
        .eq('program_id', program.id)
        .eq('status', 'approved');

      const categoryCounts = admitted.reduce((acc, app) => {
        acc[app.admission_category] = (acc[app.admission_category] || 0) + 1;
        return acc;
      }, {});

      return {
        program: program.name,
        totalSeats: program.total_seats,
        filled: admitted.length,
        occupancyRate: ((admitted.length / program.total_seats) * 100).toFixed(2),
        meritFilled: categoryCounts.merit || 0,
        quotaFilled: categoryCounts.quota || 0,
        selfFinanceFilled: categoryCounts.self_finance || 0,
        available: program.total_seats - admitted.length
      };
    }));

    res.json({ data: occupancyData });
  } catch (error) {
    console.error('Seat occupancy error:', error);
    res.status(500).json({ error: 'Failed to fetch seat occupancy' });
  }
});

export default router;
