import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft,
  Upload,
  FileText,
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
  const [programs, setPrograms] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    program_id: '',
    priority: 1,
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
    setFormData({ ...formData, program_id: program.id });
    checkEligibility(program.id);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        navigate('/applications');
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      toast.error('An error occurred while submitting');
    } finally {
      setSubmitting(false);
    }
  };

  const onDrop = (acceptedFiles) => {
    const newDocuments = acceptedFiles.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      file
    }));
    setFormData({ ...formData, documents: [...formData.documents, ...newDocuments] });
    toast.success(`${acceptedFiles.length} file(s) added`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

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
          onClick={() => step === 1 ? navigate('/applications') : setStep(1)}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">New Application</h1>
          <p className="text-gray-500">Apply for your desired program</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="text-sm font-medium">Select Program</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-sm font-medium">Complete Details</span>
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-6">
          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
              <button
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI Recommended Programs</h3>
                    <p className="text-sm text-gray-600">Based on your academic profile</p>
                  </div>
                </div>
                {showRecommendations ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              
              {showRecommendations && (
                <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.filter(r => r.match_level !== 'low').map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => handleProgramSelect(rec.program)}
                      className="text-left p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-purple-300"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          rec.match_level === 'high' ? 'bg-green-100 text-green-800' :
                          rec.match_level === 'medium' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {rec.eligibility_score}% Match
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900">{rec.program.name}</h4>
                      <p className="text-sm text-gray-500">{rec.program.department}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Programs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Available Programs</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => handleProgramSelect(program)}
                  className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <h4 className="font-medium text-gray-900">{program.name}</h4>
                  <p className="text-sm text-gray-500">{program.department}</p>
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
          <div className="bg-primary-50 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedProgram?.name}</h3>
                <p className="text-gray-600">{selectedProgram?.department}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Change
              </button>
            </div>
            
            {eligibility && (
              <div className="mt-4 p-4 bg-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {eligibility.eligible ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-700">You are eligible</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-red-700">You may not meet all requirements</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Required: {eligibility.percentage.required}% | Your percentage: {eligibility.percentage.obtained}%
                </p>
              </div>
            )}
          </div>

          {/* Academic Records */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Records</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Overall Percentage</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  placeholder="e.g., 85"
                  value={formData.academic_records.percentage}
                  onChange={(e) => setFormData({
                    ...formData,
                    academic_records: { ...formData.academic_records, percentage: e.target.value }
                  })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Passing Year</label>
                <input
                  type="number"
                  min="2000"
                  max="2030"
                  className="form-input"
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
                <label className="form-label">Board/University</label>
                <input
                  type="text"
                  className="form-input"
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
                <label className="form-label">Priority (1-5)</label>
                <select
                  className="form-input"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  required
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? '(Highest)' : n === 5 ? '(Lowest)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Supporting Documents</h3>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
              </p>
              <p className="text-sm text-gray-500 mt-2">PDF, PNG, JPG up to 10MB</p>
            </div>
            {formData.documents.length > 0 && (
              <div className="mt-4 space-y-2">
                {formData.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-700">{doc.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        documents: formData.documents.filter((_, i) => i !== index)
                      })}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Extracurricular Activities</label>
                <textarea
                  className="form-input h-24 resize-none"
                  placeholder="Describe your extracurricular activities, achievements, etc."
                  value={formData.extracurriculars}
                  onChange={(e) => setFormData({ ...formData, extracurriculars: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Personal Statement</label>
                <textarea
                  className="form-input h-32 resize-none"
                  placeholder="Why do you want to join this program?"
                  value={formData.personal_statement}
                  onChange={(e) => setFormData({ ...formData, personal_statement: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-8 flex items-center"
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
