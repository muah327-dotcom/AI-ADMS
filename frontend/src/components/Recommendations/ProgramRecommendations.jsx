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
  ThumbsDown
} from 'lucide-react';
import toast from 'react-hot-toast';

const ProgramRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

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
        setRecommendations(data.recommendations || []);
      } else {
        const error = await response.json();
        if (error.error?.includes('Academic records')) {
          toast.error('Please upload your academic documents first');
        }
      }
    } catch (error) {
      console.error('Fetch recommendations error:', error);
      toast.error('Failed to load recommendations');
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
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
          <p className="text-gray-500 mb-4">
            Upload your academic documents to get personalized program recommendations
          </p>
          <a
            href="/documents"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Upload Documents
            <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{recommendations.length}</p>
              <p className="text-sm text-gray-500">Total Programs</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-green-600">
                {recommendations.filter(r => r.match_level === 'high').length}
              </p>
              <p className="text-sm text-gray-500">High Matches</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(recommendations.reduce((acc, r) => acc + r.eligibility_score, 0) / recommendations.length)}%
              </p>
              <p className="text-sm text-gray-500">Avg. Match Score</p>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="grid lg:grid-cols-2 gap-6">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-all card-hover ${
                  rec.match_level === 'high' ? 'border-green-200' :
                  rec.match_level === 'medium' ? 'border-blue-200' :
                  rec.match_level === 'moderate' ? 'border-yellow-200' :
                  'border-red-200'
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{rec.program.name}</h3>
                      <p className="text-gray-500">{rec.program.department}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getMatchColor(rec.match_level)}`}>
                      {rec.match_level === 'high' && <ThumbsUp className="h-3 w-3 inline mr-1" />}
                      {rec.match_level === 'low' && <ThumbsDown className="h-3 w-3 inline mr-1" />}
                      {rec.match_level.charAt(0).toUpperCase() + rec.match_level.slice(1)} Match
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Match Score</span>
                        <span className={`text-lg font-bold ${getScoreColor(rec.eligibility_score)}`}>
                          {rec.eligibility_score}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rec.eligibility_score >= 80 ? 'bg-green-500' :
                            rec.eligibility_score >= 60 ? 'bg-blue-500' :
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
                      <span className={rec.details.meets_percentage ? 'text-green-700' : 'text-red-700'}>
                        Percentage: {rec.details.student_percentage}% / Required: {rec.details.required_percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {rec.details.matching_subjects === rec.details.total_required_subjects ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <span>
                        Subjects: {rec.details.matching_subjects}/{rec.details.total_required_subjects} matched
                      </span>
                    </div>
                  </div>

                  {/* Missing Subjects */}
                  {rec.details.missing_subjects.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <span className="font-medium">Missing subjects:</span>{' '}
                        {rec.details.missing_subjects.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fetchExplanation(rec.program.id)}
                      className="flex-1 flex items-center justify-center px-4 py-2 text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Why This Match?
                    </button>
                    <a
                      href={`/applications/new?program=${rec.program.id}`}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-xl max-w-lg w-full p-6 animate-scale-in">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="h-6 w-6 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Match Explanation</h3>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900">{explanation.program}</h4>
                  <p className={`text-2xl font-bold mt-1 ${getScoreColor(explanation.eligibility_score)}`}>
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
                          <Info className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <p className="text-gray-700">{exp}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { setSelectedProgram(null); setExplanation(null); }}
                  className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProgramRecommendations;
