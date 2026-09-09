import express from 'express';
import { authenticateToken, requireRole, getDepartmentFilter, isMainAdmin } from '../middleware/auth.js';
import Application from '../models/Application.js';
import Program from '../models/Program.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin', 'department_admin']));

// Helper to get program IDs for department
const getDeptProgramIds = async (req) => {
  const deptFilter = getDepartmentFilter(req);
  const mainAdmin = isMainAdmin(req);
  if (!mainAdmin && deptFilter) {
    const programs = await Program.find({ department: deptFilter.department }).select('_id');
    return programs.map(p => p._id);
  }
  return null;
};

router.get('/admissions-by-category', async (req, res) => {
  try {
    const programIds = await getDeptProgramIds(req);
    const filter = programIds ? { program_id: { $in: programIds } } : {};

    const totalCount = await Application.countDocuments(filter);
    const chartData = [
      { category: 'Merit', count: totalCount, percentage: '100' }
    ];

    res.json({ data: chartData, total: totalCount });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/applications-by-program', async (req, res) => {
  try {
    const programIds = await getDeptProgramIds(req);
    const matchStage = programIds ? { program_id: { $in: programIds } } : {};

    const data = await Application.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $group: { _id: '$program_id', count: { $sum: 1 } } },
      { $lookup: { from: 'programs', localField: '_id', foreignField: '_id', as: 'program' } },
      { $unwind: { path: '$program', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, program: { $ifNull: ['$program.name', 'Unknown'] }, count: 1 } },
      { $sort: { count: -1 } }
    ]);
    res.json({ data });
  } catch (error) {
    console.error('Program analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch program data' });
  }
});

router.get('/performance-insights', async (req, res) => {
  try {
    const programIds = await getDeptProgramIds(req);
    const filter = programIds ? { program_id: { $in: programIds } } : {};

    const ranges = [
      { label: '90-100', min: 90, max: 101 },
      { label: '80-89', min: 80, max: 90 },
      { label: '70-79', min: 70, max: 80 },
      { label: '60-69', min: 60, max: 70 },
      { label: 'Below 60', min: 0, max: 60 }
    ];

    const totalCount = await Application.countDocuments(filter);

    const chartData = await Promise.all(ranges.map(async ({ label, min, max }) => {
      const count = await Application.countDocuments({
        ...filter,
        $expr: {
          $let: {
            vars: { avg: { $avg: ['$matric_percentage', '$fsc_percentage'] } },
            in: { $and: [{ $gte: ['$$avg', min] }, { $lt: ['$$avg', max] }] }
          }
        }
      });
      return {
        range: label,
        count,
        percentage: totalCount > 0 ? ((count / totalCount) * 100).toFixed(2) : '0'
      };
    }));

    res.json({ percentageDistribution: chartData, totalApplications: totalCount });
  } catch (error) {
    console.error('Performance insights error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

router.get('/monthly-trends', async (req, res) => {
  try {
    const programIds = await getDeptProgramIds(req);
    const matchStage = programIds ? { program_id: { $in: programIds } } : {};

    const data = await Application.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: {
            year: { $year: '$application_date' },
            month: { $month: '$application_date' }
          },
          count: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $let: {
              vars: {
                months: ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              },
              in: { $concat: [{ $arrayElemAt: ['$$months', '$_id.month'] }, ' ', { $toString: '$_id.year' }] }
            }
          },
          count: 1,
          approved: 1
        }
      }
    ]);

    res.json({ data });
  } catch (error) {
    console.error('Monthly trends error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly trends' });
  }
});

router.get('/seat-occupancy', async (req, res) => {
  try {
    const programIds = await getDeptProgramIds(req);
    const matchStage = programIds ? { program_id: { $in: programIds } } : {};

    const occupancyData = await Application.aggregate([
      { $match: { status: 'approved', ...matchStage } },
      { $group: { _id: '$program_id', filled: { $sum: 1 } } },
      { $lookup: { from: 'programs', localField: '_id', foreignField: '_id', as: 'program' } },
      { $unwind: '$program' },
      {
        $project: {
          program: '$program.name',
          totalSeats: '$program.total_seats',
          filled: 1,
          occupancyRate: {
            $cond: [
              { $gt: ['$program.total_seats', 0] },
              { $round: [{ $multiply: [{ $divide: ['$filled', '$program.total_seats'] }, 100] }, 2] },
              0
            ]
          },
          available: { $subtract: ['$program.total_seats', '$filled'] }
        }
      }
    ]);

    res.json({ data: occupancyData });
  } catch (error) {
    console.error('Seat occupancy error:', error);
    res.status(500).json({ error: 'Failed to fetch seat occupancy' });
  }
});

export default router;
