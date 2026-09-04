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
  const [totalStudents, setTotalStudents] = useState(0);
  const [categoryStats, setCategoryStats] = useState({ merit: 0, quota: 0, self_finance: 0 });
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
        setTotalStudents(data.total || 0);
        if (data.stats) {
          setCategoryStats(data.stats);
        }
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
      case 'cnic': return <CreditCard className="h-5 w-5 text-primary-600" />;
      case 'photograph': return <Camera className="h-5 w-5 text-emerald-400" />;
      case 'matric': return <Award className="h-5 w-5 text-yellow-400" />;
      case 'intermediate': case 'fsc': return <GraduationCap className="h-5 w-5 text-indigo-400" />;
      case 'transcript': return <ScrollText className="h-5 w-5 text-purple-400" />;
      case 'domicile': return <MapPin className="h-5 w-5 text-rose-400" />;
      case 'fee_challan': case 'fee_receipt': return <FileCheck className="h-5 w-5 text-amber-400" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-500 mt-1">View and manage enrolled students</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-500/20">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{totalStudents}</p>
          <p className="text-sm text-gray-500">Total Students</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Crown className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {categoryStats.merit}
          </p>
          <p className="text-sm text-gray-500">Merit Category</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Star className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {categoryStats.quota}
          </p>
          <p className="text-sm text-gray-500">Quota Category</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <GraduationCap className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {categoryStats.self_finance}
          </p>
          <p className="text-sm text-gray-500">Self Finance</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search students by name, email or CNIC..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <SkeletonLoader variant="table" theme="dark" />
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedStudent(student); setShowModal(true); }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center mr-3 border border-primary-500/20">
                          <span className="text-primary-600 font-semibold">
                            {student.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                          <p className="text-xs text-gray-500">{student.cnic}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.admission_category ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${student.admission_category === 'merit' ? 'bg-yellow-100 text-yellow-800' :
                            student.admission_category === 'quota' ? 'bg-primary-100 text-primary-800' :
                              'bg-green-100 text-green-800'
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
                            <span className={`w-2 h-2 rounded-full ${app.status === 'approved' ? 'bg-green-500' :
                                app.status === 'rejected' ? 'bg-red-500' :
                                  'bg-yellow-500'
                              }`} />
                            <span className="text-sm text-gray-500">{app.program?.name}</span>
                          </div>
                        ))}
                        {student.applications?.length > 2 && (
                          <p className="text-xs text-gray-500">+{student.applications.length - 2} more</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
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
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredStudents.length} students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
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
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto animate-scale-in border border-gray-200 shadow-2xl">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur z-10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Student Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Profile */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary-50 flex items-center justify-center border border-primary-500/20">
                  <span className="text-3xl text-primary-600 font-bold">
                    {selectedStudent.full_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedStudent.full_name}</h3>
                  <p className="text-gray-500">{selectedStudent.email}</p>
                  {selectedStudent.admission_category && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${selectedStudent.admission_category === 'merit' ? 'bg-yellow-100 text-yellow-800' :
                        selectedStudent.admission_category === 'quota' ? 'bg-primary-100 text-primary-800' :
                          'bg-green-100 text-green-800'
                      }`}>
                      {getCategoryIcon(selectedStudent.admission_category)}
                      <span className="ml-2 capitalize">{selectedStudent.admission_category.replace('_', ' ')}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500">CNIC</p>
                  <p className="font-medium text-gray-900 font-mono">{selectedStudent.cnic || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{selectedStudent.phone || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 col-span-2">
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="font-medium text-gray-900">{selectedStudent.address || 'N/A'}</p>
                </div>
              </div>

              {/* Uploaded Documents Section */}
              <div>
                <h4 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600" />
                  Uploaded Documents
                  {selectedStudent.documents?.length > 0 && (
                    <span className="text-xs font-normal text-gray-500 ml-1">({selectedStudent.documents.length} files)</span>
                  )}
                </h4>
                {selectedStudent.documents && selectedStudent.documents.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {selectedStudent.documents.map((doc, idx) => {
                      const hasPreview = !!(doc.file_data || doc.file_url || doc.url);
                      return (
                        <div
                          key={doc._id || idx}
                          className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:border-gray-200 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-100 border border-gray-200">
                                  {getDocIcon(doc.type)}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900 text-sm">{getDocTypeLabel(doc.type)}</h5>
                                  <p className="text-xs text-gray-500 truncate max-w-[160px]" title={doc.name}>
                                    {doc.name || 'document_file'}
                                  </p>
                                </div>
                              </div>
                              {doc.confidence && doc.confidence > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-primary-50 text-primary-600 border border-primary-500/20 whitespace-nowrap">
                                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                                  OCR {Math.round(doc.confidence)}%
                                </span>
                              )}
                            </div>

                            {/* OCR Extracted summary */}
                            {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-[11px] text-gray-500 space-y-0.5">
                                {doc.extracted_data.cnic && (
                                  <p><strong className="text-gray-700">CNIC:</strong> <span className="font-mono text-primary-600">{doc.extracted_data.cnic}</span></p>
                                )}
                                {doc.extracted_data.name && (
                                  <p><strong className="text-gray-700">Name:</strong> {doc.extracted_data.name}</p>
                                )}
                                {doc.extracted_data.obtained_marks && (
                                  <p><strong className="text-gray-700">Marks:</strong> {doc.extracted_data.obtained_marks} / {doc.extracted_data.total_marks || 1100}</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200/80">
                            <button
                              onClick={() => handleOpenDocViewer(doc)}
                              disabled={!hasPreview}
                              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 bg-primary-50 hover:bg-primary-500 text-primary-600 hover:text-gray-900 rounded-lg transition-colors text-xs font-semibold border border-primary-500/20 disabled:opacity-40"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Preview
                            </button>
                            {hasPreview && (
                              <button
                                onClick={() => handleDownloadDoc(doc)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-colors border border-gray-200"
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
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No documents uploaded by this student.</p>
                  </div>
                )}
              </div>

              {/* Applications */}
              <div>
                <h4 className="font-bold text-gray-900 text-base mb-3">Applications</h4>
                <div className="space-y-2">
                  {selectedStudent.applications?.map((app, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{app.program?.name || app.program_id?.name}</p>
                          <p className="text-xs text-gray-500">{app.program?.department || app.program_id?.department}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${app.status === 'approved' || app.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
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
            className="bg-gradient-to-b from-gray-50 to-white rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col border border-gray-200 shadow-2xl overflow-hidden"
            style={{ animation: 'fadeInScale 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-primary-600 border border-primary-500/10 shadow-lg shadow-cyan-500/5">
                  {getDocIcon(previewDoc.type)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg tracking-tight">
                    {getDocTypeLabel(previewDoc.type)}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 truncate max-w-[250px]">{previewDoc.name || 'Document File'}</p>
                    {previewDoc.confidence && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-500/15">
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
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-gray-900 rounded-xl transition-all text-xs font-bold shadow-lg shadow-cyan-900/20 hover:shadow-cyan-900/40"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2.5 rounded-xl bg-gray-100 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all border-gray-200 hover:border-red-500/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Viewer Body — Side-by-Side */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left: Document Canvas */}
              <div className="flex-1 bg-gray-50 relative flex items-center justify-center overflow-auto">
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
                          <div className="p-4 rounded-2xl bg-gray-100 inline-block mb-4">
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
                          className="w-full h-full rounded-2xl border-gray-200 bg-white shadow-2xl"
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
                          className="max-h-[78vh] max-w-full object-contain rounded-2xl shadow-2xl border-gray-200"
                          draggable={false}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right: OCR Sidebar */}
              {previewDoc.extracted_data && Object.keys(previewDoc.extracted_data).length > 0 && (
                <div className="w-full lg:w-[340px] bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
                  {/* Sidebar Header */}
                  <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                        <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                      </div>
                      <span className="font-bold text-sm text-gray-900 tracking-tight">Extracted Details</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 ml-8">AI-powered OCR extraction results</p>
                  </div>

                  {/* Sidebar Content */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                    {previewDoc.extracted_data.name && (
                      <div className="group p-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Applicant Name</span>
                        <span className="font-semibold text-gray-900 text-sm">{previewDoc.extracted_data.name}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.father_name && (
                      <div className="group p-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Father's Name</span>
                        <span className="font-semibold text-gray-900 text-sm">{previewDoc.extracted_data.father_name}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.cnic && (
                      <div className="group p-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">CNIC / B-Form</span>
                        <span className="font-mono font-bold text-primary-600 text-sm tracking-wide">{previewDoc.extracted_data.cnic}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.date_of_birth && (
                      <div className="group p-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Date of Birth</span>
                        <span className="font-semibold text-gray-900 text-sm">{previewDoc.extracted_data.date_of_birth}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.board && (
                      <div className="group p-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Board Name</span>
                        <span className="font-semibold text-gray-900 text-sm">{previewDoc.extracted_data.board}</span>
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
                          <span className="font-semibold text-gray-700 text-sm">
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
                      <div className="group p-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1">Address</span>
                        <span className="text-gray-700 text-sm leading-relaxed">{previewDoc.extracted_data.address}</span>
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
