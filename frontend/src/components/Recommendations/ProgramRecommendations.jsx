import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Target,
  BookOpen,
  Award,
  Loader2,
  Info,
  ThumbsUp,
  ThumbsDown,
  X,
  Upload,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';

const ProgramRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [showMissingDocsModal, setShowMissingDocsModal] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recommendations/programs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const recs = data.recommendations || [];
        setRecommendations(recs);
        if (recs.length === 0) {
          setShowMissingDocsModal(true);
        }
      } else {
        const error = await response.json();
        if (error.error?.includes('Academic records') || response.status === 400) {
          setShowMissingDocsModal(true);
        }
      }
    } catch (error) {
      console.error('Fetch recommendations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (programId) => {
    setLoadingExplanation(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recommendations/explain-match', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ program_id: programId })
      });

      if (response.ok) {
        const data = await response.json();
        setExplanation(data);
        setSelectedProgram(programId);
      }
    } catch (error) {
      console.error('Explanation error:', error);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const getMatchColor = (level) => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 lg:p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-8 w-8" />
          <h1 className="text-2xl lg:text-3xl font-bold">AI Program Recommendations</h1>
        </div>
        <p className="text-purple-100 max-w-2xl">
          Our AI analyzes your academic records, subject combinations, and percentage to recommend 
          the programs where you have the highest chance of admission.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Recommendations Available</h3>
          <p className="text-gray-400 mb-4">
            Upload your academic documents to get personalized program recommendations
          </p>
          <a
            href="/dashboard/documents"
            className="inline-flex items-center px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Upload Documents
            <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4 text-center">
              <p className="text-2xl font-bold text-white">{recommendations.length}</p>
              <p className="text-sm text-gray-400">Total Programs</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4 text-center">
              <p className="text-2xl font-bold text-green-400">
                {recommendations.filter(r => r.match_level === 'high').length}
              </p>
              <p className="text-sm text-gray-400">High Matches</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">
                {Math.round(recommendations.reduce((acc, r) => acc + r.eligibility_score, 0) / recommendations.length)}%
              </p>
              <p className="text-sm text-gray-400">Avg. Match Score</p>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="grid lg:grid-cols-2 gap-6">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`bg-[#1a1a1a] rounded-xl border-2 overflow-hidden transition-all hover:border-cyan-500/50 ${
                  rec.match_level === 'high' ? 'border-green-500/30' :
                  rec.match_level === 'medium' ? 'border-cyan-500/30' :
                  rec.match_level === 'moderate' ? 'border-yellow-500/30' :
                  'border-red-500/30'
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{rec.program.name}</h3>
                      <p className="text-gray-400">{rec.program.department}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      rec.match_level === 'high' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      rec.match_level === 'medium' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                      rec.match_level === 'moderate' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {rec.match_level === 'high' && <ThumbsUp className="h-3 w-3 inline mr-1" />}
                      {rec.match_level === 'low' && <ThumbsDown className="h-3 w-3 inline mr-1" />}
                      {rec.match_level.charAt(0).toUpperCase() + rec.match_level.slice(1)} Match
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-400">Match Score</span>
                        <span className={`text-lg font-bold ${
                          rec.eligibility_score >= 80 ? 'text-green-400' :
                          rec.eligibility_score >= 60 ? 'text-cyan-400' :
                          rec.eligibility_score >= 40 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {rec.eligibility_score}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rec.eligibility_score >= 80 ? 'bg-green-500' :
                            rec.eligibility_score >= 60 ? 'bg-cyan-500' :
                            rec.eligibility_score >= 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${rec.eligibility_score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      {rec.details.meets_percentage ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={rec.details.meets_percentage ? 'text-green-400' : 'text-red-400'}>
                        Percentage: {rec.details.student_percentage}% / Required: {rec.details.required_percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {rec.details.matching_subjects === rec.details.total_required_subjects ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-gray-400">
                        Subjects: {rec.details.matching_subjects}/{rec.details.total_required_subjects} matched
                      </span>
                    </div>
                  </div>

                  {/* Missing Subjects */}
                  {rec.details.missing_subjects.length > 0 && (
                    <div className="bg-yellow-500/10 rounded-lg p-3 mb-4 border border-yellow-500/20">
                      <p className="text-sm text-yellow-400">
                        <span className="font-medium">Missing subjects:</span>{' '}
                        {rec.details.missing_subjects.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fetchExplanation(rec.program._id || rec.program.id)}
                      className="flex-1 flex items-center justify-center px-4 py-2 text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors text-sm font-medium"
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Why This Match?
                    </button>
                    <a
                      href={`/dashboard/applications/new?program=${rec.program._id || rec.program.id}`}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Apply Now
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Explanation Modal */}
          {selectedProgram && explanation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
              <div className="bg-[#1a1a1a] rounded-xl max-w-lg w-full p-6 animate-scale-in border border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">Match Explanation</h3>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-medium text-white">{explanation.program}</h4>
                  <p className={`text-2xl font-bold mt-1 ${
                    explanation.eligibility_score >= 80 ? 'text-green-400' :
                    explanation.eligibility_score >= 60 ? 'text-cyan-400' :
                    explanation.eligibility_score >= 40 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {explanation.eligibility_score}% Match
                  </p>
                </div>

                <div className="space-y-3">
                  {explanation.explanations.map((exp, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {exp.includes('meet') || exp.includes('valid') || exp.includes('strong') ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : exp.includes('below') || exp.includes('Missing') || exp.includes('improved') ? (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <Info className="h-5 w-5 text-cyan-400" />
                        )}
                      </div>
                      <p className="text-gray-300">{exp}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { setSelectedProgram(null); setExplanation(null); }}
                  className="mt-6 w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Attractive Centered Academic Documents Required Modal */}
      {showMissingDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-950/60 overflow-hidden transform transition-all animate-scale-in">
            {/* Top Accent Gradient Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400" />

            <div className="p-6 sm:p-7">
              {/* Close Button */}
              <button
                onClick={() => setShowMissingDocsModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex-shrink-0">
                  <GraduationCap className="h-7 w-7 text-purple-400" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-purple-300 bg-purple-500/10 rounded-full border border-purple-500/20 mb-1.5">
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    AI Intelligence Advisory
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 tracking-tight">
                    Academic Documents Required
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete your profile to generate personalized matches
                  </p>
                </div>
              </div>

              {/* Detail Callout */}
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl mb-5 space-y-2">
                <p className="text-sm text-slate-200 leading-relaxed">
                  Our AI recommendation engine needs your academic records (Matric & Intermediate certificates) to analyze eligibility criteria, evaluate subject combinations, and recommend programs where you have the highest chance of admission.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 mb-6 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>Instant OCR extraction from Matric & Intermediate result cards</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>AI-powered percentage & eligibility score calculation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>Personalized program match analysis and explanations</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowMissingDocsModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-medium text-xs transition-colors"
                >
                  Dismiss
                </button>
                <a
                  href="/dashboard/documents"
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all text-xs flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Documents Now
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramRecommendations;
