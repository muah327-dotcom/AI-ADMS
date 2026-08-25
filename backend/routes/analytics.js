import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Program from '../models/Program.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/admissions-by-category', async (req, res) => {
  try {
    const applications = await Application.find();

    const chartData = [
      { category: 'Merit', count: applications.length, percentage: '100' }
    ];

    res.json({ data: chartData, total: applications.length });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/applications-by-program', async (req, res) => {
  try {
    const applications = await Application.find().populate('program_id');
    const programCounts = {};
    applications.forEach(app => {
      const progName = app.program_id?.name || 'Unknown';
      programCounts[progName] = (programCounts[progName] || 0) + 1;
    });
    const data = Object.entries(programCounts).map(([program, count]) => ({ program, count }));
    res.json({ data });
  } catch (error) {
    console.error('Program analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch program data' });
  }
});

router.get('/performance-insights', async (req, res) => {
  try {
    const applications = await Application.find().populate('user_id', 'full_name');

    const percentageRanges = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      'Below 60': 0
    };

    applications.forEach(app => {
      const matricPercentage = app.matric_percentage || 0;
      const fscPercentage = app.fsc_percentage || 0;
      const percentage = (matricPercentage + fscPercentage) / 2;

      if (percentage >= 90) percentageRanges['90-100']++;
      else if (percentage >= 80) percentageRanges['80-89']++;
      else if (percentage >= 70) percentageRanges['70-79']++;
      else if (percentage >= 60) percentageRanges['60-69']++;
      else percentageRanges['Below 60']++;
    });

    const chartData = Object.entries(percentageRanges).map(([range, count]) => ({
      range,
      count,
      percentage: applications.length > 0 ? ((count / applications.length) * 100).toFixed(2) : '0'
    }));

    res.json({
      percentageDistribution: chartData,
      totalApplications: applications.length
    });
  } catch (error) {
    console.error('Performance insights error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

router.get('/monthly-trends', async (req, res) => {
  try {
    const applications = await Application.find().select('application_date status');

    const monthlyData = applications.reduce((acc, app) => {
      const date = new Date(app.application_date);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = { count: 0, approved: 0 };
      }
      
      acc[monthYear].count++;
      if (app.status === 'approved') {
        acc[monthYear].approved++;
      }
      
      return acc;
    }, {});

    const trends = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data
    }));

    res.json({ data: trends });
  } catch (error) {
    console.error('Monthly trends error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly trends' });
  }
});

router.get('/seat-occupancy', async (req, res) => {
  try {
    const programs = await Program.find();

    const occupancyData = await Promise.all(programs.map(async (program) => {
      const admitted = await Application.find({
        program_id: program._id,
        status: 'approved'
      });

      return {
        program: program.name,
        totalSeats: program.total_seats,
        filled: admitted.length,
        occupancyRate: program.total_seats > 0 ? ((admitted.length / program.total_seats) * 100).toFixed(2) : '0.00',
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
