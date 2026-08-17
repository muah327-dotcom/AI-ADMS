import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const NewApplication = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [step, setStep] = useState(1);
  
  const [usedPriorities, setUsedPriorities] = useState([]);
  const [formData, setFormData] = useState({
    program_id: '',
    priority: '',
    academic_records: {
      percentage: '',
      passing_year: '',
      board: '',
      subjects: []
    },
    documents: [],
    extracurriculars: '',
    personal_statement: ''
  });

  useEffect(() => {
    fetchProgramsAndRecommendations();
  }, []);

  // Auto-fill academic records from user profile (matric & inter marks)
  useEffect(() => {
    if (!user) return;

    const matricObt = parseFloat(user.matric_obtained_marks);
    const matricTot = parseFloat(user.matric_total_marks);
    const interObt = parseFloat(user.inter_obtained_marks);
    const interTot = parseFloat(user.inter_total_marks);

    // Calculate individual percentages
    const matricPct = (!isNaN(matricObt) && !isNaN(matricTot) && matricTot > 0)
      ? (matricObt / matricTot) * 100 : null;
    const interPct = (!isNaN(interObt) && !isNaN(interTot) && interTot > 0)
      ? (interObt / interTot) * 100 : null;

    // Average of available percentages
    let avgPercentage = null;
    if (matricPct !== null && interPct !== null) {
      avgPercentage = ((matricPct + interPct) / 2).toFixed(2);
    } else if (interPct !== null) {
      avgPercentage = interPct.toFixed(2);
    } else if (matricPct !== null) {
      avgPercentage = matricPct.toFixed(2);
    }

    const interPassingYear = user.inter_passing_year || '';
    const interBoard = user.inter_board || '';

    setFormData(prev => ({
      ...prev,
      academic_records: {
        ...prev.academic_records,
        percentage: avgPercentage || prev.academic_records.percentage,
        passing_year: interPassingYear || prev.academic_records.passing_year,
        board: interBoard || prev.academic_records.board
      }
    }));
  }, [user]);

  const fetchProgramsAndRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const [programsRes, recsRes] = await Promise.all([
        fetch('/api/applications/programs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/recommendations/programs', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (programsRes.ok) {
        const data = await programsRes.json();
        setPrograms(data.programs || []);
      }

      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.recommendations?.slice(0, 5) || []);
      }

      // Fetch existing applications to find already-used priorities
      const appsRes = await fetch('/api/applications/my-applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        const used = (appsData.applications || []).map(a => a.priority).filter(Boolean);
        setUsedPriorities(used);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async (programId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/applications/programs/${programId}/eligibility`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEligibility(data);
      }
    } catch (error) {
      console.error('Eligibility check error:', error);
    }
  };

  const handleProgramSelect = (program) => {
    setSelectedProgram(program);
    const programId = program._id || program.id;
    setFormData({ ...formData, program_id: programId });
    checkEligibility(programId);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mandatory documents & profile verification guard
    const mandatoryDocTypes = ['cnic', 'photograph', 'matric', 'intermediate'];
    const userDocs = user?.uploaded_documents || [];
    const hasAllMandatory = mandatoryDocTypes.every(t => userDocs.includes(t));

    if (!user?.is_verified || !hasAllMandatory) {
      toast.error('Application Submission Blocked: All non-optional mandatory documents (CNIC, Photograph, Matric Certificate, Intermediate Certificate) must be uploaded and profile verified first.', { duration: 7000 });
      return;
    }

    // Frontend eligibility guard
    const enteredPct = parseFloat(formData.academic_records.percentage);
    const minPct = selectedProgram?.min_percentage ?? 0;
    if (!isNaN(enteredPct) && enteredPct < minPct) {
      toast.error(`Your percentage (${enteredPct}%) is below the minimum required (${minPct}%) for ${selectedProgram?.name}. Application rejected.`);
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Application submitted successfully!');
        navigate('/dashboard/applications');
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      toast.error('An error occurred while submitting');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => step === 1 ? navigate('/dashboard/applications') : setStep(1)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">New Application</h1>
          <p className="text-gray-400 mt-1">Apply for your desired program</p>
        </div>
      </div>

      {/* Mandatory Document & Profile Verification Advisory Banner */}
      {(!user?.is_verified || !['cnic', 'photograph', 'matric', 'intermediate'].every(t => (user?.uploaded_documents || []).includes(t))) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-200">Mandatory Document Upload & Profile Verification Required</h4>
              <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                All non-optional documents (CNIC / B-Form, Recent Photograph, Matric Certificate, Intermediate Certificate) are mandatory. You must upload them and verify your profile before submitting admission applications.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/documents')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors whitespace-nowrap flex-shrink-0 shadow-md"
          >
            Upload Non-Optional Documents
          </button>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-cyan-500' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            1
          </div>
          <span className="text-sm font-medium">Select Program</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-700" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-cyan-500' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            2
          </div>
          <span className="text-sm font-medium">Complete Details</span>
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-6">
          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-purple-700/50">
              <button
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-purple-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI Recommended Programs</h3>
                    <p className="text-sm text-gray-400">Based on your academic profile</p>
                  </div>
                </div>
                {showRecommendations ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              
              {showRecommendations && (
                <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.filter(r => r.match_level !== 'low').map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => handleProgramSelect(rec.program)}
                      className="text-left p-4 bg-[#1a1a1a] rounded-lg border border-gray-700 hover:border-purple-500 hover:bg-gray-800/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          rec.match_level === 'high' ? 'bg-green-500/20 text-green-400' :
                          rec.match_level === 'medium' ? 'bg-cyan-500/20 text-cyan-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {rec.eligibility_score}% Match
                        </span>
                      </div>
                      <h4 className="font-medium text-white">{rec.program.name}</h4>
                      <p className="text-sm text-gray-400">{rec.program.department}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Programs */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">All Available Programs</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((program) => (
                <button
                  key={program._id || program.id}
                  onClick={() => handleProgramSelect(program)}
                  className="text-left p-4 border border-gray-700 rounded-lg hover:border-cyan-500 hover:bg-gray-800/50 transition-all"
                >
                  <h4 className="font-medium text-white">{program.name}</h4>
                  <p className="text-sm text-gray-400">{program.department}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Info className="h-3 w-3" />
                    <span>Min {program.min_percentage}% required</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected Program Info */}
          <div className="bg-cyan-500/10 rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedProgram?.name}</h3>
                <p className="text-gray-400">{selectedProgram?.department}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Change
              </button>
            </div>
            
            {eligibility && (() => {
              const currentPercentage = parseFloat(formData.academic_records.percentage) || parseFloat(eligibility.percentage?.obtained) || 0;
              const requiredPercentage = eligibility.percentage?.required ?? selectedProgram?.min_percentage ?? 0;
              const isEligible = currentPercentage >= requiredPercentage;

              return (
                <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    {isEligible ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-400">You are eligible</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-400">You do not meet minimum percentage requirements</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    Required: {requiredPercentage}% | Your percentage: {currentPercentage}%
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Academic Records */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Academic Records</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Overall Percentage</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={`w-full px-4 py-2 bg-[#0f0f0f] border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white placeholder-gray-500 ${
                    formData.academic_records.percentage !== '' &&
                    parseFloat(formData.academic_records.percentage) < (selectedProgram?.min_percentage ?? 0)
                      ? 'border-red-500'
                      : 'border-gray-700'
                  }`}
                  placeholder="e.g., 85"
                  value={formData.academic_records.percentage}
                  onChange={(e) => setFormData({
                    ...formData,
                    academic_records: { ...formData.academic_records, percentage: e.target.value }
                  })}
                  required
                />
                {formData.academic_records.percentage !== '' &&
                  parseFloat(formData.academic_records.percentage) < (selectedProgram?.min_percentage ?? 0) && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Below minimum required percentage ({selectedProgram?.min_percentage}%). Application will be rejected.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Passing Year</label>
                <input
                  type="number"
                  min="2000"
                  max="2030"
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white placeholder-gray-500"
                  placeholder="e.g., 2024"
                  value={formData.academic_records.passing_year}
                  onChange={(e) => setFormData({
                    ...formData,
                    academic_records: { ...formData.academic_records, passing_year: e.target.value }
                  })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Board/University</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white placeholder-gray-500"
                  placeholder="e.g., BISE Lahore"
                  value={formData.academic_records.board}
                  onChange={(e) => setFormData({
                    ...formData,
                    academic_records: { ...formData.academic_records, board: e.target.value }
                  })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority (1-5)</label>
                <select
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  required
                >
                  <option value="" disabled>Select priority</option>
                  {[1, 2, 3, 4, 5].map(n => {
                    const isUsed = usedPriorities.includes(n);
                    return (
                      <option key={n} value={n} disabled={isUsed}>
                        {n} {n === 1 ? '(Highest)' : n === 5 ? '(Lowest)' : ''}{isUsed ? ' — Already used' : ''}
                      </option>
                    );
                  })}
                </select>
                {usedPriorities.length > 0 && (
                  <p className="mt-1 text-xs text-yellow-400">
                    Priority {usedPriorities.sort().join(', ')} already used in your other applications.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2 text-gray-400 hover:text-white font-medium"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default NewApplication;
