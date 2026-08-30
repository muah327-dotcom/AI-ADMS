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
  GraduationCap,
  Building2,
  MapPin,
  ExternalLink,
  Clock,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from '../Common/SkeletonLoader';

const ProgramRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [lowMeritData, setLowMeritData] = useState(null);
  const [activeTab, setActiveTab] = useState('smart'); // 'smart', 'colleges', 'all'
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [showMissingDocsModal, setShowMissingDocsModal] = useState(false);
  const [studentMerit, setStudentMerit] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [programsRes, lowMeritRes] = await Promise.all([
        fetch('/api/recommendations/programs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/recommendations/low-merit-options', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      let hasData = false;

      if (programsRes.ok) {
        const pData = await programsRes.json();
        setRecommendations(pData.recommendations || []);
        if (pData.student_percentage) setStudentMerit(pData.student_percentage);
        if ((pData.recommendations || []).length > 0) hasData = true;
      }

      if (lowMeritRes.ok) {
        const lmData = await lowMeritRes.json();
        setLowMeritData(lmData);
        if (lmData.student_merit) setStudentMerit(lmData.student_merit);
        hasData = true;
      }

      if (!hasData) {
        setShowMissingDocsModal(true);
      }
    } catch (error) {
      console.error('Fetch recommendations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (item, isExternal = false) => {
    setLoadingExplanation(true);
    try {
      const token = localStorage.getItem('token');
      const payload = isExternal
        ? {
          college_name: item.college_name,
          shift: item.shift,
          is_external: true,
          student_merit: studentMerit,
          cutoff: item.min_merit_cutoff
        }
        : {
          program_id: item.id || item._id || item.program?._id || item.program?.id,
          shift: item.shift || item.program?.shift || 'Morning',
          student_merit: studentMerit,
          cutoff: item.min_merit_cutoff || item.program?.min_percentage || 60
        };

      const response = await fetch('/api/recommendations/explain-match', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setExplanation(data);
        setSelectedProgram(item);
      }
    } catch (error) {
      console.error('Explanation error:', error);
    } finally {
      setLoadingExplanation(false);
    }
  };

  if (loading) {
    return <SkeletonLoader variant="list" theme="dark" />;
  }

  const internalAlternatives = lowMeritData?.internal_alternatives || [];
  const partnerColleges = lowMeritData?.partner_colleges || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-cyan-950 p-6 lg:p-8 border border-purple-500/30 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              AI-Powered Low-Merit Recommendation Engine
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Program & Institution Recommendations
            </h1>
            <p className="text-slate-300 mt-1 max-w-2xl text-sm leading-relaxed">
              Our Scikit-Learn KNN & Cosine Similarity model evaluates your academic merit against cutoff thresholds, predicting in-house alternative shifts and accredited partner institutions with high acceptance likelihood.
            </p>
          </div>

          {studentMerit > 0 && (
            <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-cyan-500/30 text-center flex-shrink-0 min-w-[160px] shadow-lg">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Your Merit Score</p>
              <p className="text-3xl font-extrabold text-cyan-400 mt-0.5">{studentMerit}%</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded text-[11px]">
                {studentMerit >= 75 ? '🟢 High Merit' : studentMerit >= 60 ? '🟡 Moderate Merit' : '🔵 Alternative Match'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#121212] rounded-xl border border-gray-800">
        <button
          onClick={() => setActiveTab('smart')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'smart'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>In-House Alternatives ({internalAlternatives.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('colleges')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'colleges'
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md shadow-purple-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Partner Colleges ({partnerColleges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'all'
              ? 'bg-gray-800 text-white border border-gray-700'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
        >
          <Layers className="h-4 w-4" />
          <span>All Programs ({recommendations.length})</span>
        </button>
      </div>

      {/* AI Advisory Summary Callout */}
      {lowMeritData?.ai_advice && (
        <div className="bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-slate-900 p-4 rounded-xl border border-cyan-500/20 flex items-start gap-3.5 shadow-md">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-cyan-300">AI Admission Strategist</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{lowMeritData.ai_advice}</p>
          </div>
        </div>
      )}

      {/* TAB 1: In-House Alternatives */}
      {activeTab === 'smart' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-cyan-400" />
              In-House Alternative Programs & Flexible Shifts
            </h3>
            <span className="text-xs text-gray-400">Ranked by Admission Acceptance Probability</span>
          </div>

          {internalAlternatives.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-white">No internal alternative programs found</h4>
              <p className="text-xs text-gray-400 mt-1">Please verify your documents to compute your profile score.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {internalAlternatives.map((prog, idx) => (
                <div
                  key={idx}
                  className="bg-[#1a1a1a] rounded-xl border border-gray-800 hover:border-cyan-500/40 p-5 transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-colors" />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {prog.field_category}
                        </span>
                        <h4 className="text-base font-bold text-white mt-1.5 group-hover:text-cyan-300 transition-colors">
                          {prog.name}
                        </h4>
                        <p className="text-xs text-gray-400">{prog.department}</p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${prog.match_level === 'high'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : prog.match_level === 'medium'
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>
                        {prog.admission_probability}% Acceptance
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-gray-800/80 text-xs">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Shift</span>
                        <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-cyan-400" />
                          {prog.shift}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Closing Cutoff</span>
                        <span className="font-semibold text-white mt-0.5 block">{prog.min_merit_cutoff}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Total Fee</span>
                        <span className="font-semibold text-white mt-0.5 block">PKR {prog.total_fee?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => fetchExplanation(prog, false)}
                      className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Info className="h-3.5 w-3.5 text-cyan-400" />
                      Why This Option?
                    </button>
                    <a
                      href={`/dashboard/applications/new?program=${prog.id}`}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-md shadow-cyan-500/20"
                    >
                      <span>Apply Shift</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Partner Colleges */}
      {activeTab === 'colleges' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-400" />
              Accredited Partner Institutions Offering Lower Cutoffs
            </h3>
            <span className="text-xs text-gray-400">Nearby Affiliated Institutions</span>
          </div>

          {partnerColleges.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-white">No partner colleges currently registered</h4>
              <p className="text-xs text-gray-400 mt-1">Please check back or contact admissions for external affiliation lists.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {partnerColleges.map((college, idx) => (
                <div
                  key={idx}
                  className="bg-[#1a1a1a] rounded-xl border border-gray-800 hover:border-purple-500/40 p-5 transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {college.field_category}
                        </span>
                        <h4 className="text-base font-bold text-white mt-1.5 group-hover:text-purple-300 transition-colors">
                          {college.program_name}
                        </h4>
                        <p className="text-xs font-semibold text-slate-300 mt-0.5">{college.college_name}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-purple-400" />
                          {college.city} &bull; {college.affiliation}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${college.match_level === 'high'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        }`}>
                        {college.admission_probability}% Acceptance
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-gray-800/80 text-xs">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Required Cutoff</span>
                        <span className="font-semibold text-white mt-0.5 block">{college.min_merit_cutoff}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Shift</span>
                        <span className="font-semibold text-white mt-0.5 block">{college.shift}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Annual Fee</span>
                        <span className="font-semibold text-white mt-0.5 block">PKR {college.total_fee?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => fetchExplanation(college, true)}
                      className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Info className="h-3.5 w-3.5 text-purple-400" />
                      AI Evaluation
                    </button>
                    {college.website_url ? (
                      <a
                        href={college.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-md shadow-purple-600/20"
                      >
                        <span>Visit College</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="flex-1 px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-xs text-center">
                        Contact Admissions
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: All Programs */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-gray-400" />
              All University Degree Programs & Eligibility Status
            </h3>
            <span className="text-xs text-gray-400">Total: {recommendations.length} Programs</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`bg-[#1a1a1a] rounded-xl border p-5 transition-all ${rec.match_level === 'high'
                    ? 'border-emerald-500/30'
                    : rec.match_level === 'medium'
                      ? 'border-cyan-500/30'
                      : 'border-gray-800'
                  }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-base font-bold text-white">{rec.program.name}</h4>
                    <p className="text-xs text-gray-400">{rec.program.department}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${rec.details.meets_percentage
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    }`}>
                    {rec.details.meets_percentage ? 'Eligible' : 'Below Cutoff'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300 mb-4 bg-black/30 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Minimum Required Percentage:</span>
                    <span className="font-semibold text-white">{rec.details.required_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your Calculated Percentage:</span>
                    <span className="font-semibold text-cyan-400">{rec.details.student_percentage}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchExplanation(rec.program, false)}
                    className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Info className="h-3.5 w-3.5 text-cyan-400" />
                    Why This Match?
                  </button>
                  <a
                    href={`/dashboard/applications/new?program=${rec.program._id || rec.program.id}`}
                    className="flex-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1"
                  >
                    <Target className="h-3.5 w-3.5" />
                    Apply
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Explanation Modal */}
      {selectedProgram && explanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden transform transition-all animate-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />

            <div className="p-6">
              <button
                onClick={() => { setSelectedProgram(null); setExplanation(null); }}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 bg-cyan-500/10 rounded-full border border-cyan-500/20 mb-1">
                    AI Probability Breakdown
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    {explanation.program}
                  </h3>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Predicted Acceptance Chance</span>
                  <span className="text-2xl font-black text-cyan-400">{explanation.eligibility_score}% Probability</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block">Closing Cutoff</span>
                  <span className="text-base font-bold text-white">{explanation.cutoff}%</span>
                </div>
              </div>

              <div className="space-y-2.5 mb-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Evaluation Highlights:</h4>
                {explanation.explanations?.map((exp, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                    <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-200 leading-relaxed">{exp}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => { setSelectedProgram(null); setExplanation(null); }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missing Academic Documents Centered Modal */}
      {showMissingDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-950/60 overflow-hidden transform transition-all animate-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400" />

            <div className="p-6 sm:p-7">
              <button
                onClick={() => setShowMissingDocsModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>

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

              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl mb-5 space-y-2">
                <p className="text-sm text-slate-200 leading-relaxed">
                  Our AI recommendation engine needs your academic records (Matric & Intermediate certificates) to analyze eligibility criteria, evaluate subject combinations, and recommend programs where you have the highest chance of admission.
                </p>
              </div>

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
                  <span>Personalized program match analysis and partner college recommendations</span>
                </div>
              </div>

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
