import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Award,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Crown,
  GraduationCap,
  Eye,
  CreditCard,
  Camera,
  ScrollText,
  MapPin,
  FileCheck,
  Sparkles,
  AlertCircle,
  X,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from '../Common/SkeletonLoader';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCard, setActiveCard] = useState('total');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [programs, setPrograms] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, merit: 0, registered: 0 });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Document Viewer State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Fetch programs on mount
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/programs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPrograms(data.programs || []);
        }
      } catch (error) {
        console.error('Fetch programs error:', error);
      }
    };
    fetchPrograms();
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('category', activeCard);
      if (selectedProgram !== 'all') params.append('program', selectedProgram);
      params.append('page', page);
      params.append('limit', 20);

      const response = await fetch(`/api/admin/students?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setTotalPages(data.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Fetch students error:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [activeCard, selectedProgram, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleCardClick = (card) => {
    setActiveCard(card);
    setPage(1);
    setSearchTerm('');
  };

  const handleProgramChange = (e) => {
    setSelectedProgram(e.target.value);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('category', activeCard);
      if (selectedProgram !== 'all') params.append('program', selectedProgram);

      const response = await fetch(`/api/admin/students/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `students_${activeCard}_${selectedProgram}_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Export downloaded successfully');
      } else {
        toast.error('Failed to export students');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export students');
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

  const getStatusBadge = (applications) => {
    if (!applications || applications.length === 0) return null;
    const statuses = applications.map(a => a.status);
    if (statuses.includes('confirmed')) return { label: 'Registered', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' };
    if (statuses.includes('approved')) return { label: 'Approved', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' };
    if (statuses.includes('waitlisted')) return { label: 'Waitlisted', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' };
    if (statuses.includes('pending')) return { label: 'Pending', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' };
    if (statuses.includes('rejected')) return { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' };
    return null;
  };

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.cnic?.includes(searchTerm)
  );

  const getOrdinal = (n) => {
    if (!n || isNaN(n)) return '';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getMeritApp = (student) => {
    if (!student.applications) return null;
    return student.applications.find(a => a.merit_list_number != null) || null;
  };

  const cardConfig = [
    { key: 'total', label: 'Total Students', icon: Users, color: 'primary', count: stats.total },
    { key: 'merit', label: 'Merit List Students', icon: Crown, color: 'yellow', count: stats.merit },
    { key: 'registered', label: 'Registered Students', icon: CheckCircle, color: 'green', count: stats.registered }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Student Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage enrolled students</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards — 3 clickable cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cardConfig.map(({ key, label, icon: Icon, color, count }) => {
          const isActive = activeCard === key;
          const colorClasses = {
            primary: isActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/30'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-700',
            yellow: isActive
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 ring-2 ring-yellow-500/30'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-yellow-300 dark:hover:border-yellow-700',
            green: isActive
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/30'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-700'
          };
          const iconBg = {
            primary: 'bg-primary-50 dark:bg-primary-900/20 border-primary-500/20',
            yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500/20',
            green: 'bg-green-50 dark:bg-green-900/20 border-green-500/20'
          };
          const iconText = {
            primary: 'text-primary-600 dark:text-primary-400',
            yellow: 'text-yellow-500 dark:text-yellow-400',
            green: 'text-green-600 dark:text-green-400'
          };

          return (
            <div
              key={key}
              onClick={() => handleCardClick(key)}
              className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all duration-200 ${colorClasses[color]}`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg border ${iconBg[color]}`}>
                  <Icon className={`h-5 w-5 ${iconText[color]}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters: Search + Program Dropdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search students by name, email or CNIC..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 dark:text-white"
              value={selectedProgram}
              onChange={handleProgramChange}
            >
              <option value="all">All Programs</option>
              {programs.map(prog => (
                <option key={prog._id} value={prog._id}>{prog.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {loading ? (
          <SkeletonLoader variant="table" theme="dark" />
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No students found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applications</th>
                  {activeCard === 'merit' && (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Merit List</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Merit</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStudents.map((student) => {
                  const statusBadge = getStatusBadge(student.applications);
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => { setSelectedStudent(student); setShowModal(true); }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mr-3 border border-primary-500/20">
                            <span className="text-primary-600 dark:text-primary-400 font-semibold">
                              {student.full_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{student.full_name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{student.cnic}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 text-sm">Applied</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {student.applications?.slice(0, 2).map((app, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${app.status === 'confirmed' || app.status === 'approved' ? 'bg-green-500' :
                                app.status === 'rejected' ? 'bg-red-500' :
                                  app.status === 'waitlisted' ? 'bg-yellow-500' :
                                    'bg-gray-400'
                                }`} />
                              <span className="text-sm text-gray-500 dark:text-gray-400">{app.program_id?.name || 'Program'}</span>
                            </div>
                          ))}
                          {student.applications?.length > 2 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">+{student.applications.length - 2} more</p>
                          )}
                        </div>
                      </td>
                      {activeCard === 'merit' && (() => {
                        const meritApp = getMeritApp(student);
                        const meritListNum = meritApp?.merit_list_number;
                        const meritPct = meritApp?.fsc_percentage;
                        return (
                          <>
                            <td className="px-6 py-4">
                              {meritListNum ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                  {getOrdinal(meritListNum)} Merit List
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {meritPct != null ? (
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{meritPct.toFixed(2)}%</span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                              )}
                            </td>
                          </>
                        );
                      })()}
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(student.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredStudents.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredStudents.length} students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto animate-scale-in border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur z-10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Profile */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center border border-primary-500/20">
                  <span className="text-3xl text-primary-600 dark:text-primary-400 font-bold">
                    {selectedStudent.full_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedStudent.full_name}</h3>
                  <p className="text-gray-500 dark:text-gray-400">{selectedStudent.email}</p>
                  {(() => {
                    const badge = getStatusBadge(selectedStudent.applications);
                    return badge ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${badge.color}`}>
                        {badge.label}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">CNIC</p>
                  <p className="font-medium text-gray-900 dark:text-white font-mono">{selectedStudent.cnic || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedStudent.phone || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedStudent.address || 'N/A'}</p>
                </div>
              </div>

              {/* Uploaded Documents Section */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  Uploaded Documents
                  {selectedStudent.documents?.length > 0 && (
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">({selectedStudent.documents.length} files)</span>
                  )}
                </h4>
                {selectedStudent.documents && selectedStudent.documents.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {selectedStudent.documents.map((doc, idx) => {
                      const hasPreview = !!(doc.file_data || doc.file_url || doc.url);
                      return (
                        <div
                          key={doc._id || idx}
                          className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-gray-200 dark:hover:border-gray-600 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-600">
                                  {getDocIcon(doc.type)}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900 dark:text-white text-sm">{getDocTypeLabel(doc.type)}</h5>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]" title={doc.name}>
                                    {doc.name || 'document_file'}
                                  </p>
                                </div>
                              </div>
                              {doc.confidence && doc.confidence > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-500/20 whitespace-nowrap">
                                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                                  OCR {Math.round(doc.confidence)}%
                                </span>
                              )}
                            </div>

                            {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                                {doc.extracted_data.cnic && (
                                  <p><strong className="text-gray-700 dark:text-gray-300">CNIC:</strong> <span className="font-mono text-primary-600 dark:text-primary-400">{doc.extracted_data.cnic}</span></p>
                                )}
                                {doc.extracted_data.name && (
                                  <p><strong className="text-gray-700 dark:text-gray-300">Name:</strong> {doc.extracted_data.name}</p>
                                )}
                                {doc.extracted_data.obtained_marks && (
                                  <p><strong className="text-gray-700 dark:text-gray-300">Marks:</strong> {doc.extracted_data.obtained_marks} / {doc.extracted_data.total_marks || 1100}</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200/80 dark:border-gray-700/80">
                            <button
                              onClick={() => handleOpenDocViewer(doc)}
                              disabled={!hasPreview}
                              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-500 text-primary-600 dark:text-primary-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors text-xs font-semibold border border-primary-500/20 disabled:opacity-40"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Preview
                            </button>
                            {hasPreview && (
                              <button
                                onClick={() => handleDownloadDoc(doc)}
                                className="p-1.5 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
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
                  <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                    <AlertCircle className="h-8 w-8 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No documents uploaded by this student.</p>
                  </div>
                )}
              </div>

              {/* Applications */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3">Applications</h4>
                <div className="space-y-2">
                  {selectedStudent.applications?.map((app, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{app.program_id?.name || 'Program'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{app.program_id?.department || ''}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${app.status === 'approved' || app.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          app.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  )) || <p className="text-gray-500 dark:text-gray-400">No applications</p>}
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
            className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            style={{ animation: 'fadeInScale 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/10 shadow-lg shadow-cyan-500/5">
                  {getDocIcon(previewDoc.type)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">
                    {getDocTypeLabel(previewDoc.type)}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[250px]">{previewDoc.name || 'Document File'}</p>
                    {previewDoc.confidence && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full border border-primary-500/15">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        {Math.round(previewDoc.confidence)}% OCR
                      </span>
                    )}
                  </div>
                </div>
              </div>

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

            {/* Viewer Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 bg-gray-50 dark:bg-gray-700/30 relative flex items-center justify-center overflow-auto">
                <div className="w-full h-full flex items-center justify-center p-6">
                  {(() => {
                    const src = previewDoc.file_data || previewDoc.file_url || previewDoc.url;
                    const isPdf = previewDoc.mime_type === 'application/pdf' ||
                      previewDoc.name?.toLowerCase().endsWith('.pdf') ||
                      (src && src.startsWith('data:application/pdf'));

                    if (!src) {
                      return (
                        <div className="text-center py-20">
                          <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-600 inline-block mb-4">
                            <AlertCircle className="h-10 w-10 text-gray-600 dark:text-gray-400" />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No preview available for this document.</p>
                        </div>
                      );
                    }

                    if (isPdf) {
                      const pdfSrc = src.includes('?') ? `${src}&toolbar=0&navpanes=0` : `${src}#toolbar=0&navpanes=0`;
                      return (
                        <iframe
                          src={pdfSrc}
                          title={previewDoc.name || 'PDF Document'}
                          className="w-full h-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl"
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
                <div className="w-full lg:w-[340px] bg-gray-50 dark:bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                        <Sparkles className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">Extracted Details</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 ml-8">AI-powered OCR extraction results</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                    {previewDoc.extracted_data.name && (
                      <div className="group p-3.5 rounded-xl bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Applicant Name</span>
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{previewDoc.extracted_data.name}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.father_name && (
                      <div className="group p-3.5 rounded-xl bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Father's Name</span>
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{previewDoc.extracted_data.father_name}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.cnic && (
                      <div className="group p-3.5 rounded-xl bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">CNIC / B-Form</span>
                        <span className="font-mono font-bold text-primary-600 dark:text-primary-400 text-sm tracking-wide">{previewDoc.extracted_data.cnic}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.date_of_birth && (
                      <div className="group p-3.5 rounded-xl bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Date of Birth</span>
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{previewDoc.extracted_data.date_of_birth}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.board && (
                      <div className="group p-3.5 rounded-xl bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Board Name</span>
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{previewDoc.extracted_data.board}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.obtained_marks !== undefined && previewDoc.extracted_data.obtained_marks !== null && (
                      <div className="group p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/[0.05] to-transparent hover:from-emerald-500/[0.1] border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Marks Obtained / Total</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-emerald-400 text-lg">
                            {previewDoc.extracted_data.obtained_marks}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">/</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
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
                      <div className="group p-3.5 rounded-xl bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Address</span>
                        <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{previewDoc.extracted_data.address}</span>
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
