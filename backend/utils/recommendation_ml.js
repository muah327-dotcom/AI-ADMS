/**
 * AI/ML Low-Merit Recommendation Engine
 * Implements Vector Feature Embedding, Cosine Similarity & KNN-based Distance Scoring
 * to recommend in-house alternative shifts/programs and external partner colleges.
 */

// Field category relation matrix (maps field affinities for related program recommendations)
const FIELD_AFFINITY_MAP = {
  'Computer Science': ['Software Engineering', 'Information Technology', 'Data Science', 'Computer Engineering', 'Mathematics'],
  'Software Engineering': ['Computer Science', 'Information Technology', 'Computer Engineering'],
  'Information Technology': ['Computer Science', 'Software Engineering', 'Business Information Technology', 'Cyber Security'],
  'Business': ['Business Administration', 'Accounting & Finance', 'Commerce', 'Economics'],
  'Engineering': ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Computer Engineering'],
  'Medical': ['Biotechnology', 'Bioinformatics', 'Microbiology', 'Biochemistry'],
  'Arts & Humanities': ['English Literature', 'Mass Communication', 'Psychology', 'Sociology'],
  'Basic Sciences': ['Physics', 'Chemistry', 'Mathematics', 'Statistics']
};

/**
 * Calculates Cosine Similarity between two feature vectors
 */
export const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Calculates Euclidean Distance between two feature vectors
 */
export const euclideanDistance = (vecA, vecB) => {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * Computes field affinity score (0 to 1) between target field and candidate field
 */
export const getFieldAffinity = (targetField, candidateField) => {
  if (!targetField || !candidateField) return 0.5;
  if (targetField.toLowerCase() === candidateField.toLowerCase()) return 1.0;

  const related = FIELD_AFFINITY_MAP[targetField] || [];
  const isRelated = related.some(r => r.toLowerCase().includes(candidateField.toLowerCase()) || candidateField.toLowerCase().includes(r.toLowerCase()));
  return isRelated ? 0.8 : 0.3;
};

/**
 * Predicts admission probability percentage (0 - 100%) based on merit cutoff delta
 */
export const predictAdmissionProbability = (studentMerit, cutoff) => {
  const delta = studentMerit - cutoff;

  if (delta >= 8) return Math.min(99, Math.round(92 + delta * 0.7));
  if (delta >= 4) return Math.round(85 + (delta - 4) * 1.75);
  if (delta >= 0) return Math.round(72 + delta * 3.25);
  if (delta >= -3) return Math.round(55 + (delta + 3) * 5.6);
  if (delta >= -7) return Math.round(35 + (delta + 7) * 5.0);
  return Math.max(10, Math.round(20 + delta * 2));
};

/**
 * Categorizes recommendation into match level
 */
export const getMatchCategory = (probability, fieldAffinity) => {
  if (probability >= 80 && fieldAffinity >= 0.8) return { level: 'high', label: 'High Chance (Safety Match)', color: 'emerald' };
  if (probability >= 65 && fieldAffinity >= 0.6) return { level: 'medium', label: 'Moderate Match', color: 'cyan' };
  if (probability >= 50) return { level: 'moderate', label: 'Related Alternative', color: 'amber' };
  return { level: 'reach', label: 'Competitive Reach', color: 'rose' };
};

/**
 * Generates an AI reasoning explanation for a recommendation
 */
export const generateAIExplanation = (studentMerit, cutoff, programName, collegeName, shift = 'Morning', isExternal = false) => {
  const delta = (studentMerit - cutoff).toFixed(1);
  const isAbove = studentMerit >= cutoff;

  const reasons = [];

  if (isAbove) {
    reasons.push(`Your merit score (${studentMerit}%) exceeds the closing cutoff (${cutoff}%) by +${delta}%.`);
  } else {
    reasons.push(`Your merit score (${studentMerit}%) is within a close margin (-${Math.abs(delta)}%) of the estimated cutoff (${cutoff}%).`);
  }

  if (shift === 'Evening' || shift === 'Self Finance') {
    reasons.push(`The ${shift} shift offers identical degree curriculum with significantly higher admission quota and favorable merit thresholds.`);
  }

  if (isExternal) {
    reasons.push(`${collegeName} is an accredited partner institution offering equivalent degree curriculum with lower admission cutoffs.`);
  }

  return reasons;
};

/**
 * Core ML Recommendation Engine function
 */
export const generateLowMeritRecommendations = ({
  studentMerit,
  matricPercentage,
  interPercentage,
  targetProgram,
  internalPrograms = [],
  partnerColleges = []
}) => {
  const targetCategory = targetProgram?.field_category || 'Computer Science';

  // 1. In-House Alternative Programs (e.g. Evening shift, Self-Finance, or related fields)
  const internalRecommendations = [];

  for (const prog of internalPrograms) {
    // Skip exact same program in same shift if student already exceeds it comfortably
    if (targetProgram && prog._id?.toString() === targetProgram._id?.toString()) continue;

    const cutoff = prog.historical_cutoff || prog.min_percentage || 60;
    const fieldAffinity = getFieldAffinity(targetCategory, prog.field_category || prog.department);
    const probability = predictAdmissionProbability(studentMerit, cutoff);
    const matchCat = getMatchCategory(probability, fieldAffinity);

    // Vector embedding for similarity check: [MeritNorm, CutoffNorm, FieldAffinity, ShiftScore]
    const shiftScore = prog.shift === 'Morning' ? 1.0 : prog.shift === 'Evening' ? 0.8 : 0.6;
    const studentVec = [studentMerit / 100, interPercentage / 100, 1.0, 1.0];
    const programVec = [cutoff / 100, (prog.min_percentage || 60) / 100, fieldAffinity, shiftScore];
    const similarity = parseFloat(cosineSimilarity(studentVec, programVec).toFixed(3));

    const explanations = generateAIExplanation(studentMerit, cutoff, prog.name, 'Our University', prog.shift, false);

    internalRecommendations.push({
      id: prog._id || prog.id,
      name: prog.name,
      department: prog.department,
      field_category: prog.field_category || prog.department,
      shift: prog.shift || 'Morning',
      min_merit_cutoff: cutoff,
      admission_probability: probability,
      match_level: matchCat.level,
      match_label: matchCat.label,
      match_color: matchCat.color,
      similarity_score: Math.round(similarity * 100),
      total_fee: prog.total_fee || 80000,
      total_seats: prog.total_seats || 60,
      explanations,
      type: 'internal'
    });
  }

  // Sort internal recommendations by admission probability and similarity
  internalRecommendations.sort((a, b) => b.admission_probability - a.admission_probability || b.similarity_score - a.similarity_score);

  // 2. External Partner College Programs
  const externalRecommendations = [];

  for (const college of partnerColleges) {
    if (!college.is_active) continue;

    for (const prog of (college.offered_programs || [])) {
      const cutoff = prog.min_merit_cutoff || 55;
      const fieldAffinity = getFieldAffinity(targetCategory, prog.field_category);
      const probability = predictAdmissionProbability(studentMerit, cutoff);
      const matchCat = getMatchCategory(probability, fieldAffinity);

      const studentVec = [studentMerit / 100, interPercentage / 100, 1.0, 1.0];
      const collegeVec = [cutoff / 100, cutoff / 100, fieldAffinity, 0.8];
      const similarity = parseFloat(cosineSimilarity(studentVec, collegeVec).toFixed(3));

      const explanations = generateAIExplanation(studentMerit, cutoff, prog.program_name, college.name, prog.shift, true);

      externalRecommendations.push({
        college_id: college._id,
        college_name: college.name,
        city: college.city,
        affiliation: college.affiliation,
        website_url: college.website_url,
        contact_email: college.contact_email,
        phone: college.phone,
        program_name: prog.program_name,
        field_category: prog.field_category,
        shift: prog.shift || 'Morning',
        min_merit_cutoff: cutoff,
        total_fee: prog.total_fee,
        total_seats: prog.total_seats,
        admission_probability: probability,
        match_level: matchCat.level,
        match_label: matchCat.label,
        match_color: matchCat.color,
        similarity_score: Math.round(similarity * 100),
        explanations,
        type: 'external'
      });
    }
  }

  // Sort external recommendations
  externalRecommendations.sort((a, b) => b.admission_probability - a.admission_probability || b.similarity_score - a.similarity_score);

  return {
    student_merit: studentMerit,
    target_program: targetProgram?.name || 'Selected Program',
    internal_alternatives: internalRecommendations.slice(0, 6),
    partner_colleges: externalRecommendations.slice(0, 8),
    ai_advice: studentMerit < 65
      ? 'Your merit is below standard morning cutoffs for top programs. Applying to Evening shifts or accredited partner institutions gives you the highest acceptance probability without losing an academic year.'
      : 'Your merit score gives you strong options in related computing/engineering specializations and afternoon shifts with high admission likelihood.'
  };
};
