import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Program from '../models/Program.js';
import College from '../models/College.js';
import Application from '../models/Application.js';
import {
  generateLowMeritRecommendations,
  predictAdmissionProbability,
  getMatchCategory,
  generateAIExplanation
} from '../utils/recommendation_ml.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * Helper to compute student's actual percentage from user profile
 */
const getStudentPercentage = (user) => {
  if (!user) return 0;

  // Check direct academic_records percentage
  if (user.academic_records?.percentage && user.academic_records.percentage > 0) {
    return parseFloat(user.academic_records.percentage);
  }

  const interObt = parseFloat(user.inter_obtained_marks);
  const interTot = parseFloat(user.inter_total_marks);
  const matricObt = parseFloat(user.matric_obtained_marks);
  const matricTot = parseFloat(user.matric_total_marks);

  const interPct = (!isNaN(interObt) && !isNaN(interTot) && interTot > 0) ? (interObt / interTot) * 100 : null;
  const matricPct = (!isNaN(matricObt) && !isNaN(matricTot) && matricTot > 0) ? (matricObt / matricTot) * 100 : null;

  if (interPct !== null && matricPct !== null) {
    return parseFloat(((interPct + matricPct) / 2).toFixed(2));
  } else if (interPct !== null) {
    return parseFloat(interPct.toFixed(2));
  } else if (matricPct !== null) {
    return parseFloat(matricPct.toFixed(2));
  }

  return 0;
};

const calculateEligibilityScore = (studentProfile, program, studentPercentage) => {
  const percentage = studentPercentage || getStudentPercentage(studentProfile);
  const subjectScores = studentProfile.academic_records?.subject_scores || {};

  let score = 0;

  if (percentage >= program.min_percentage) {
    score += 40;
  } else if (percentage >= program.min_percentage - 5) {
    score += 25;
  } else if (percentage >= program.min_percentage - 10) {
    score += 10;
  }

  const requiredSubjects = program.required_subjects || [];
  const studentSubjects = Object.keys(subjectScores);

  const matchingSubjects = requiredSubjects.filter(reqSub =>
    studentSubjects.some(studSub =>
      studSub.toLowerCase().includes(reqSub.toLowerCase()) ||
      reqSub.toLowerCase().includes(studSub.toLowerCase())
    )
  );

  const subjectMatchPercentage = requiredSubjects.length > 0
    ? (matchingSubjects.length / requiredSubjects.length) * 100
    : 100;
  score += (subjectMatchPercentage / 100) * 40;

  const avgSubjectScore = Object.values(subjectScores).length > 0
    ? Object.values(subjectScores).reduce((a, b) => a + b, 0) / Object.values(subjectScores).length
    : percentage;
  score += (avgSubjectScore / 100) * 20;

  return Math.min(Math.round(score), 100);
};

/**
 * Standard Programs Recommendation Route
 */
router.get('/programs', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    const studentPercentage = getStudentPercentage(user);

    if (!studentPercentage || studentPercentage === 0) {
      return res.status(400).json({
        error: 'Academic records not found. Please upload your academic documents first.'
      });
    }

    const programs = await Program.find({ is_active: true });

    const recommendations = programs.map(program => {
      const eligibilityScore = calculateEligibilityScore(user, program, studentPercentage);

      const subjectScores = user.academic_records?.subject_scores || {};
      const studentSubjects = Object.keys(subjectScores);

      const requiredSubjects = program.required_subjects || [];
      const missingSubjects = requiredSubjects.filter(reqSub =>
        !studentSubjects.some(studSub =>
          studSub.toLowerCase().includes(reqSub.toLowerCase()) ||
          reqSub.toLowerCase().includes(studSub.toLowerCase())
        )
      );

      let matchLevel = 'low';
      if (eligibilityScore >= 80) matchLevel = 'high';
      else if (eligibilityScore >= 60) matchLevel = 'medium';
      else if (eligibilityScore >= 40) matchLevel = 'moderate';

      return {
        program,
        eligibility_score: eligibilityScore,
        match_level: matchLevel,
        details: {
          meets_percentage: studentPercentage >= program.min_percentage,
          student_percentage: studentPercentage,
          required_percentage: program.min_percentage,
          matching_subjects: requiredSubjects.length - missingSubjects.length,
          total_required_subjects: requiredSubjects.length,
          missing_subjects: missingSubjects
        }
      };
    });

    recommendations.sort((a, b) => b.eligibility_score - a.eligibility_score);

    res.json({
      recommendations,
      student_percentage: studentPercentage,
      total_programs: programs.length,
      high_matches: recommendations.filter(r => r.match_level === 'high').length
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * AI Low-Merit Recommendation Engine Route
 * Evaluates student merit against cutoffs and returns in-house alternatives + external partner colleges
 */
router.get('/low-merit-options', async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_program_id } = req.query;

    const [user, internalPrograms, partnerColleges] = await Promise.all([
      User.findById(userId),
      Program.find({ is_active: true }),
      College.find({ is_active: true })
    ]);

    const studentMerit = getStudentPercentage(user);

    if (!studentMerit || studentMerit === 0) {
      return res.status(400).json({
        error: 'Academic records not found. Please upload your academic documents first.'
      });
    }

    let targetProgram = null;
    if (target_program_id) {
      targetProgram = await Program.findById(target_program_id);
    }

    const interObt = parseFloat(user.inter_obtained_marks || 0);
    const interTot = parseFloat(user.inter_total_marks || 1);
    const matricObt = parseFloat(user.matric_obtained_marks || 0);
    const matricTot = parseFloat(user.matric_total_marks || 1);

    const interPct = interTot > 0 ? (interObt / interTot) * 100 : studentMerit;
    const matricPct = matricTot > 0 ? (matricObt / matricTot) * 100 : studentMerit;

    const result = generateLowMeritRecommendations({
      studentMerit,
      matricPercentage: matricPct,
      interPercentage: interPct,
      targetProgram,
      internalPrograms,
      partnerColleges
    });

    res.json(result);
  } catch (error) {
    console.error('Low-merit recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate low-merit options' });
  }
});

router.get('/best-fit', async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    const userId = req.user.id;

    const [user, programs] = await Promise.all([
      User.findById(userId),
      Program.find({ is_active: true })
    ]);

    const studentPercentage = getStudentPercentage(user);

    const scoredPrograms = programs.map(program => ({
      program,
      score: studentPercentage ? calculateEligibilityScore(user, program, studentPercentage) : (program.min_percentage || 75)
    }));

    scoredPrograms.sort((a, b) => b.score - a.score);

    const bestFit = scoredPrograms.slice(0, parseInt(limit)).map(item => ({
      ...item.program.toObject(),
      match_score: item.score
    }));

    res.json({ bestFit });
  } catch (error) {
    console.error('Best fit error:', error);
    res.status(500).json({ error: 'Failed to generate best fit recommendations' });
  }
});

router.post('/explain-match', async (req, res) => {
  try {
    const { program_id, college_name, shift, is_external, student_merit, cutoff } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const actualMerit = student_merit || getStudentPercentage(user);

    let programName = 'Target Program';
    let minCutoff = cutoff || 65;

    if (program_id) {
      const program = await Program.findById(program_id);
      if (program) {
        programName = program.name;
        minCutoff = program.historical_cutoff || program.min_percentage || 65;
      }
    }

    const explanations = generateAIExplanation(
      actualMerit,
      minCutoff,
      programName,
      college_name || 'Our University',
      shift || 'Morning',
      Boolean(is_external)
    );

    const probability = predictAdmissionProbability(actualMerit, minCutoff);

    res.json({
      program: programName,
      explanations,
      eligibility_score: probability,
      student_merit: actualMerit,
      cutoff: minCutoff
    });
  } catch (error) {
    console.error('Explain match error:', error);
    res.status(500).json({ error: 'Failed to explain match' });
  }
});

export default router;
