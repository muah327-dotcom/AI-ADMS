import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Award,
  FileText,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  Crown,
  Star,
  GraduationCap,
  Eye,
  CreditCard,
  Camera,
  ScrollText,
  MapPin,
  FileCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCw,
  AlertCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from '../Common/SkeletonLoader';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Document Viewer State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    fetchStudents();
  }, [categoryFilter, page]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('page', page);
      params.append('limit', 20);

      const response = await fetch(`/api/admin/students?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch students error:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'merit':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'quota':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'self_finance':
        return <GraduationCap className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getDocIcon = (type) => {
    switch (type) {
      case 'cnic': return <CreditCard className="h-5 w-5 text-cyan-400" />;
      case 'photograph': return <Camera className="h-5 w-5 text-emerald-400" />;
      case 'matric': return <Award className="h-5 w-5 text-yellow-400" />;
      case 'intermediate': case 'fsc': return <GraduationCap className="h-5 w-5 text-indigo-400" />;
      case 'transcript': return <ScrollText className="h-5 w-5 text-purple-400" />;
      case 'domicile': return <MapPin className="h-5 w-5 text-rose-400" />;
      case 'fee_challan': case 'fee_receipt': return <FileCheck className="h-5 w-5 text-amber-400" />;
      default: return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getDocTypeLabel = (type) => {
    const map = {
      cnic: 'CNIC / B-Form', photograph: 'Photograph', matric: 'Matric Certificate',
      intermediate: 'Intermediate Certificate', fsc: 'Intermediate Certificate',
      transcript: 'Transcript / Mark Sheet', domicile: 'Domicile Certificate',
      fee_challan: 'Fee Challan Receipt', fee_receipt: 'Fee Challan Receipt', other: 'Document'
    };
    return map[type] || (type ? type.toUpperCase() : 'Document');
  };

  const handleOpenDocViewer = (doc) => {
    setPreviewDoc(doc);
    setZoomLevel(1);
    setRotation(0);
  };

  const handleDownloadDoc = (doc) => {
    if (!doc) return;
    const src = doc.file_data || doc.file_url || doc.url;
    if (!src) { toast.error('No downloadable content'); return; }
    const link = document.createElement('a');
    link.href = src;
    link.download = doc.name || doc.filename || `${doc.type || 'document'}_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'merit':
        return 'bg-yellow-100 text-yellow-800';
      case 'quota':
        return 'bg-blue-100 text-blue-800';
      case 'self_finance':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.cnic?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Student Management</h1>
          <p className="text-gray-400 mt-1">View and manage enrolled students</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{students.length}</p>
          <p className="text-sm text-gray-400">Total Students</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Crown className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {students.filter(s => s.admission_category === 'merit').length}
          </p>
          <p className="text-sm text-gray-400">Merit Category</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Star className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {students.filter(s => s.admission_category === 'quota').length}
          </p>
          <p className="text-sm text-gray-400">Quota Category</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <GraduationCap className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {students.filter(s => s.admission_category === 'self_finance').length}
          </p>
          <p className="text-sm text-gray-400">Self Finance</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search students by name, email or CNIC..."
              className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              className="px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="merit">Merit</option>
              <option value="quota">Quota</option>
              <option value="self_finance">Self Finance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <SkeletonLoader variant="table" theme="dark" />
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No students found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedStudent(student); setShowModal(true); }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center mr-3 border border-cyan-500/20">
                          <span className="text-cyan-400 font-semibold">
                            {student.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{student.full_name}</p>
                          <p className="text-sm text-gray-400">{student.email}</p>
                          <p className="text-xs text-gray-500">{student.cnic}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.admission_category ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          student.admission_category === 'merit' ? 'bg-yellow-500/20 text-yellow-400' :
                          student.admission_category === 'quota' ? 'bg-cyan-500/20 text-cyan-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {getCategoryIcon(student.admission_category)}
                          <span className="ml-2 capitalize">{student.admission_category.replace('_', ' ')}</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Not categorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {student.applications?.slice(0, 2).map((app, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              app.status === 'approved' ? 'bg-green-500' :
                              app.status === 'rejected' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`} />
                            <span className="text-sm text-gray-400">{app.program?.name}</span>
                          </div>
                        ))}
                        {student.applications?.length > 2 && (
                          <p className="text-xs text-gray-500">+{student.applications.length - 2} more</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredStudents.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {filteredStudents.length} students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto animate-scale-in border border-gray-800 shadow-2xl">
            <div className="p-6 border-b border-gray-800 sticky top-0 bg-[#1a1a1a]/95 backdrop-blur z-10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Student Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Profile */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <span className="text-3xl text-cyan-400 font-bold">
                    {selectedStudent.full_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedStudent.full_name}</h3>
                  <p className="text-gray-400">{selectedStudent.email}</p>
                  {selectedStudent.admission_category && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                      selectedStudent.admission_category === 'merit' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedStudent.admission_category === 'quota' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {getCategoryIcon(selectedStudent.admission_category)}
                      <span className="ml-2 capitalize">{selectedStudent.admission_category.replace('_', ' ')}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-500">CNIC</p>
                  <p className="font-medium text-white font-mono">{selectedStudent.cnic || 'N/A'}</p>
                </div>
                <div className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-white">{selectedStudent.phone || 'N/A'}</p>
                </div>
                <div className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-800 col-span-2">
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="font-medium text-white">{selectedStudent.address || 'N/A'}</p>
                </div>
              </div>

              {/* Uploaded Documents Section */}
              <div>
                <h4 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-400" />
                  Uploaded Documents
                  {selectedStudent.documents?.length > 0 && (
                    <span className="text-xs font-normal text-gray-400 ml-1">({selectedStudent.documents.length} files)</span>
                  )}
                </h4>
                {selectedStudent.documents && selectedStudent.documents.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {selectedStudent.documents.map((doc, idx) => {
                      const hasPreview = !!(doc.file_data || doc.file_url || doc.url);
                      return (
                        <div
                          key={doc._id || idx}
                          className="p-4 bg-[#0f0f0f] rounded-xl border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-800/80 border border-gray-700">
                                  {getDocIcon(doc.type)}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-white text-sm">{getDocTypeLabel(doc.type)}</h5>
                                  <p className="text-xs text-gray-400 truncate max-w-[160px]" title={doc.name}>
                                    {doc.name || 'document_file'}
                                  </p>
                                </div>
                              </div>
                              {doc.confidence && doc.confidence > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
                                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                                  OCR {Math.round(doc.confidence)}%
                                </span>
                              )}
                            </div>

                            {/* OCR Extracted summary */}
                            {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                              <div className="mt-2 p-2 bg-[#161616] rounded-lg border border-gray-800/80 text-[11px] text-gray-400 space-y-0.5">
                                {doc.extracted_data.cnic && (
                                  <p><strong className="text-gray-300">CNIC:</strong> <span className="font-mono text-cyan-400">{doc.extracted_data.cnic}</span></p>
                                )}
                                {doc.extracted_data.name && (
                                  <p><strong className="text-gray-300">Name:</strong> {doc.extracted_data.name}</p>
                                )}
                                {doc.extracted_data.obtained_marks && (
                                  <p><strong className="text-gray-300">Marks:</strong> {doc.extracted_data.obtained_marks} / {doc.extracted_data.total_marks || 1100}</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/80">
                            <button
                              onClick={() => handleOpenDocViewer(doc)}
                              disabled={!hasPreview}
                              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded-lg transition-colors text-xs font-semibold border border-cyan-500/20 disabled:opacity-40"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Preview
                            </button>
                            {hasPreview && (
                              <button
                                onClick={() => handleDownloadDoc(doc)}
                                className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-[#0f0f0f] rounded-xl border border-gray-800 text-center">
                    <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No documents uploaded by this student.</p>
                  </div>
                )}
              </div>

              {/* Applications */}
              <div>
                <h4 className="font-bold text-white text-base mb-3">Applications</h4>
                <div className="space-y-2">
                  {selectedStudent.applications?.map((app, idx) => (
                    <div key={idx} className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{app.program?.name || app.program_id?.name}</p>
                          <p className="text-xs text-gray-400">{app.program?.department || app.program_id?.department}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          app.status === 'approved' || app.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                          app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      {app.admission_category && (
                        <p className="text-xs text-gray-500 mt-1">
                          Category: <span className="capitalize">{app.admission_category.replace('_', ' ')}</span>
                        </p>
                      )}
                    </div>
                  )) || <p className="text-gray-500">No applications</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setPreviewDoc(null)}>
          <div
            className="bg-gradient-to-b from-[#1a1a2e] to-[#16162a] rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col border border-gray-700/50 shadow-2xl overflow-hidden"
            style={{ animation: 'fadeInScale 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/10 shadow-lg shadow-cyan-500/5">
                  {getDocIcon(previewDoc.type)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight">
                    {getDocTypeLabel(previewDoc.type)}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400 truncate max-w-[250px]">{previewDoc.name || 'Document File'}</p>
                    {previewDoc.confidence && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/15">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        {Math.round(previewDoc.confidence)}% OCR
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all text-xs font-bold shadow-lg shadow-cyan-900/20 hover:shadow-cyan-900/40"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all border border-white/5 hover:border-red-500/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Viewer Body — Side-by-Side */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left: Document Canvas */}
              <div className="flex-1 bg-[#0d0d1a] relative flex items-center justify-center overflow-auto">
                {/* Floating Zoom/Rotate Toolbar */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl" style={{ zIndex: 10 }}>
                  <button
                    onClick={() => setZoomLevel(z => Math.max(0.25, z - 0.25))}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <div className="w-px h-5 bg-white/10 mx-0.5" />
                  <span className="text-[11px] text-gray-400 font-mono w-10 text-center select-none">{Math.round(zoomLevel * 100)}%</span>
                  <div className="w-px h-5 bg-white/10 mx-0.5" />
                  <button
                    onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <div className="w-px h-5 bg-white/10 mx-0.5" />
                  <button
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Rotate"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <div className="w-px h-5 bg-white/10 mx-0.5" />
                  <button
                    onClick={() => { setZoomLevel(1); setRotation(0); }}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-[10px] text-gray-400 hover:text-white font-semibold tracking-wide transition-colors"
                    title="Reset View"
                  >
                    RESET
                  </button>
                </div>

                {/* Document Render */}
                <div className="w-full h-full flex items-center justify-center p-6">
                  {(() => {
                    const src = previewDoc.file_data || previewDoc.file_url || previewDoc.url;
                    const isPdf = previewDoc.mime_type === 'application/pdf' ||
                      previewDoc.name?.toLowerCase().endsWith('.pdf') ||
                      (src && src.startsWith('data:application/pdf'));

                    if (!src) {
                      return (
                        <div className="text-center py-20">
                          <div className="p-4 rounded-2xl bg-gray-800/30 inline-block mb-4">
                            <AlertCircle className="h-10 w-10 text-gray-600" />
                          </div>
                          <p className="text-gray-500 text-sm font-medium">No preview available for this document.</p>
                        </div>
                      );
                    }

                    if (isPdf) {
                      const pdfSrc = src.includes('?') ? `${src}&toolbar=0&navpanes=0` : `${src}#toolbar=0&navpanes=0`;
                      return (
                        <iframe
                          src={pdfSrc}
                          title={previewDoc.name || 'PDF Document'}
                          className="w-full h-full rounded-2xl border border-white/5 bg-white shadow-2xl"
                        />
                      );
                    }

                    return (
                      <div
                        className="transition-transform duration-300 ease-out flex items-center justify-center cursor-grab active:cursor-grabbing"
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                          transformOrigin: 'center center'
                        }}
                      >
                        <img
                          src={src}
                          alt={previewDoc.name || 'Document'}
                          className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/5"
                          draggable={false}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right: OCR Sidebar */}
              {previewDoc.extracted_data && Object.keys(previewDoc.extracted_data).length > 0 && (
                <div className="w-full lg:w-[340px] bg-[#12121f] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col flex-shrink-0 overflow-hidden">
                  {/* Sidebar Header */}
                  <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                      </div>
                      <span className="font-bold text-sm text-white tracking-tight">Extracted Details</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 ml-8">AI-powered OCR extraction results</p>
                  </div>

                  {/* Sidebar Content */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                    {previewDoc.extracted_data.name && (
                      <div className="group p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Applicant Name</span>
                        <span className="font-semibold text-white text-sm">{previewDoc.extracted_data.name}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.father_name && (
                      <div className="group p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Father's Name</span>
                        <span className="font-semibold text-white text-sm">{previewDoc.extracted_data.father_name}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.cnic && (
                      <div className="group p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">CNIC / B-Form</span>
                        <span className="font-mono font-bold text-cyan-400 text-sm tracking-wide">{previewDoc.extracted_data.cnic}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.date_of_birth && (
                      <div className="group p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Date of Birth</span>
                        <span className="font-semibold text-white text-sm">{previewDoc.extracted_data.date_of_birth}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.board && (
                      <div className="group p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Board Name</span>
                        <span className="font-semibold text-white text-sm">{previewDoc.extracted_data.board}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.obtained_marks !== undefined && previewDoc.extracted_data.obtained_marks !== null && (
                      <div className="group p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/[0.05] to-transparent hover:from-emerald-500/[0.1] border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Marks Obtained / Total</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-emerald-400 text-lg">
                            {previewDoc.extracted_data.obtained_marks}
                          </span>
                          <span className="text-gray-500 text-sm">/</span>
                          <span className="font-semibold text-gray-300 text-sm">
                            {previewDoc.extracted_data.total_marks || 1100}
                          </span>
                          {previewDoc.extracted_data.total_marks && (
                            <span className="ml-1.5 text-xs font-semibold text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {((previewDoc.extracted_data.obtained_marks / previewDoc.extracted_data.total_marks) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {previewDoc.extracted_data.address && (
                      <div className="group p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Address</span>
                        <span className="text-gray-300 text-sm leading-relaxed">{previewDoc.extracted_data.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
