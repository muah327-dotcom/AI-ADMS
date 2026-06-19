import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Program from '../models/Program.js';
import Application from '../models/Application.js';

const router = express.Router();

router.use(authenticateToken);

const calculateEligibilityScore = (studentProfile, program) => {
  const academicRecords = studentProfile.academic_records || {};
  const percentage = academicRecords.percentage || 0;
  const subjectScores = academicRecords.subject_scores || {};
  
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
  
  const subjectMatchPercentage = (matchingSubjects.length / requiredSubjects.length) * 100;
  score += (subjectMatchPercentage / 100) * 40;
  
  const avgSubjectScore = Object.values(subjectScores).reduce((a, b) => a + b, 0) / 
    (Object.values(subjectScores).length || 1);
  score += (avgSubjectScore / 100) * 20;
  
  return Math.min(Math.round(score), 100);
};

router.get('/programs', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('academic_records preferences');

    if (!user?.academic_records) {
      return res.status(400).json({ 
        error: 'Academic records not found. Please upload your academic documents first.' 
      });
    }

    const programs = await Program.find({ is_active: true });

    const recommendations = programs.map(program => {
      const eligibilityScore = calculateEligibilityScore(user, program);
      
      const academicRecords = user.academic_records || {};
      const percentage = academicRecords.percentage || 0;
      const subjectScores = academicRecords.subject_scores || {};
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
          meets_percentage: percentage >= program.min_percentage,
          student_percentage: percentage,
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
      total_programs: programs.length,
      high_matches: recommendations.filter(r => r.match_level === 'high').length
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

router.get('/best-fit', async (req, res) => {
  try {
    const { limit = 3 } = req.query;

    const programs = await Program.find({ is_active: true });

    // Simplified scoring without user academic records
    const scoredPrograms = programs.map(program => ({
      program,
      score: program.min_percentage || 75
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
    const { program_id } = req.body;

    const program = await Program.findById(program_id);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    const explanations = [];
    
    // Simplified explanation without user academic records
    explanations.push(`This program requires a minimum percentage of ${program.min_percentage}%`);

    const requiredSubjects = program.required_subjects || [];
    if (requiredSubjects.length > 0) {
      explanations.push(`Required subjects: ${requiredSubjects.join(', ')}`);
    }

    res.json({
      program: program.name,
      explanations,
      eligibility_score: 75
    });
  } catch (error) {
    console.error('Explain match error:', error);
    res.status(500).json({ error: 'Failed to explain match' });
  }
});

export default router;
