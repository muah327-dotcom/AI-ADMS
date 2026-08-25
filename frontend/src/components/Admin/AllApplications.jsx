import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  ChevronDown,
  FileText,
  CreditCard,
  Camera,
  Award,
  GraduationCap,
  ScrollText,
  MapPin,
  FileCheck,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Calendar,
  User,
  Phone,
  Mail,
  ZoomIn,
  ZoomOut,
  RotateCw,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const AllApplications = () => {
  const [applications, setApplications] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState('');

  // Document Viewer Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, programFilter, page]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (programFilter !== 'all') params.append('program', programFilter);
      params.append('page', page);
      params.append('limit', 20);

      const [appsRes, progsRes] = await Promise.all([
        fetch(`/api/admin/all-applications?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/applications/programs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(data.applications || []);
        setTotalPages(data.totalPages || 1);
      }

      if (progsRes.ok) {
        const data = await progsRes.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status, notes = '') => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const finalNotes = adminRemarks || notes;
      const response = await fetch(`/api/admin/applications/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes: finalNotes })
      });

      if (response.ok) {
        toast.success(`Application ${status.replace('_', ' ')} successfully`);
        fetchApplications();
        setShowModal(false);
        setSelectedApplication(null);
        setAdminRemarks('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Error updating application');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'rejected':
      case 'dropped':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-cyan-400" />;
      case 'waitlisted':
        return <Clock className="h-4 w-4 text-purple-400" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getDocIcon = (type) => {
    switch (type) {
      case 'cnic':
        return <CreditCard className="h-5 w-5 text-cyan-400" />;
      case 'photograph':
        return <Camera className="h-5 w-5 text-emerald-400" />;
      case 'matric':
        return <Award className="h-5 w-5 text-yellow-400" />;
      case 'intermediate':
      case 'fsc':
        return <GraduationCap className="h-5 w-5 text-indigo-400" />;
      case 'transcript':
        return <ScrollText className="h-5 w-5 text-purple-400" />;
      case 'domicile':
        return <MapPin className="h-5 w-5 text-rose-400" />;
      case 'fee_challan':
      case 'fee_receipt':
        return <FileCheck className="h-5 w-5 text-amber-400" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getDocTypeLabel = (type) => {
    const map = {
      cnic: 'CNIC / B-Form',
      photograph: 'Recent Photograph',
      matric: 'Matric Certificate',
      intermediate: 'Intermediate Certificate',
      fsc: 'Intermediate Certificate',
      transcript: 'Transcript / Mark Sheet',
      domicile: 'Domicile Certificate',
      fee_challan: 'Paid Fee Challan Receipt',
      fee_receipt: 'Paid Fee Challan Receipt',
      other: 'Supporting Document'
    };
    return map[type] || (type ? type.toUpperCase() : 'Document');
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleOpenDocViewer = (doc) => {
    setPreviewDoc(doc);
    setZoomLevel(1);
    setRotation(0);
  };

  const handleDownloadDoc = (doc) => {
    if (!doc) return;
    const fileSource = doc.file_data || doc.file_url || doc.url;
    if (!fileSource) {
      toast.error('No downloadable file content available');
      return;
    }
    const link = document.createElement('a');
    link.href = fileSource;
    link.download = doc.name || doc.filename || `${doc.type || 'document'}_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Document download started');
  };

  // Compile all available documents for the selected application
  const getAllApplicationDocuments = (app) => {
    if (!app) return [];
    const list = [];
    const seenTypes = new Set();

    // 1. From MongoDB Document collection
    if (app.student_documents && Array.isArray(app.student_documents)) {
      app.student_documents.forEach(doc => {
        const type = doc.type || doc._id || doc.id;
        if (!seenTypes.has(type)) {
          seenTypes.add(type);
          list.push(doc);
        }
      });
    }

    // 2. From application.documents array
    if (app.documents && Array.isArray(app.documents)) {
      app.documents.forEach((doc, idx) => {
        const type = doc.type || `app-doc-${idx}`;
        if (!seenTypes.has(type)) {
          seenTypes.add(type);
          const id = doc._id || `app-doc-${idx}`;
          list.push({
            _id: id,
            type: doc.type,
            name: doc.filename || doc.name || getDocTypeLabel(doc.type),
            file_url: doc.url,
            file_data: doc.url,
            mime_type: doc.mime_type || (doc.url?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            uploaded_at: doc.uploaded_at
          });
        }
      });
    }

    // 3. From fee_challan paid receipt
    if (app.fee_challan?.paid_receipt_url) {
      const type = 'fee_receipt';
      if (!seenTypes.has(type)) {
        seenTypes.add(type);
        const receiptId = 'fee-receipt';
        list.push({
          _id: receiptId,
          type: 'fee_receipt',
          name: app.fee_challan.filename || 'Paid_Fee_Challan_Receipt.png',
          file_url: app.fee_challan.paid_receipt_url,
          file_data: app.fee_challan.paid_receipt_url,
          mime_type: 'image/png',
          uploaded_at: app.fee_challan.uploaded_at
        });
      }
    }

    return list;
  };

  const filteredApplications = applications.filter(app =>
    app.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.student?.cnic?.includes(searchTerm) ||
    app.program?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportCSV = () => {
    if (applications.length === 0) {
      toast.error('No applications to export');
      return;
    }
    const headers = ['Student Name', 'Email', 'CNIC', 'Phone', 'Program', 'Matric %', 'Inter %', 'Status', 'Applied Date'];
    const rows = applications.map(a => [
      `"${a.student?.full_name || ''}"`,
      `"${a.student?.email || ''}"`,
      `"${a.student?.cnic || ''}"`,
      `"${a.student?.phone || ''}"`,
      `"${a.program?.name || ''}"`,
      a.matric_percentage || a.student?.matric_obtained_marks ? ((a.student?.matric_obtained_marks / a.student?.matric_total_marks) * 100).toFixed(1) : '',
      a.fsc_percentage || a.student?.inter_obtained_marks ? ((a.student?.inter_obtained_marks / a.student?.inter_total_marks) * 100).toFixed(1) : '',
      `"${a.status || ''}"`,
      new Date(a.application_date).toLocaleDateString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admissions_applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Applications exported to CSV');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">All Applications</h1>
          <p className="text-gray-400 mt-1">Review student credentials, check uploaded documents, and manage admission decisions</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Download className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by student name, email, CNIC, or program..."
              className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              className="px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-white"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="confirmed">Confirmed</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <select
              className="px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-white"
              value={programFilter}
              onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Programs</option>
              {programs.map(p => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No applications found</h3>
            <p className="text-gray-400">Try adjusting your search or filter parameters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Applied Program</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Academic Score</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Documents</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredApplications.map((app) => {
                  const docCount = (app.student_documents?.length || 0) + (app.documents?.length || 0);
                  return (
                    <tr key={app.id || app._id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center mr-3 border border-cyan-500/20 text-cyan-400 font-bold">
                            {app.student?.full_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{app.student?.full_name || 'N/A'}</p>
                            <p className="text-sm text-gray-400">{app.student?.email}</p>
                            <p className="text-xs text-gray-500 font-mono">{app.student?.cnic || 'CNIC Pending'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{app.program?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400">{app.program?.department}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-0.5">
                          {app.fsc_percentage || app.student?.inter_obtained_marks ? (
                            <p className="text-gray-300">
                              <span className="text-xs text-gray-500 mr-1">Inter:</span>
                              <span className="font-medium text-white">
                                {app.fsc_percentage ? `${app.fsc_percentage}%` : `${app.student?.inter_obtained_marks}/${app.student?.inter_total_marks}`}
                              </span>
                            </p>
                          ) : null}
                          {app.matric_percentage || app.student?.matric_obtained_marks ? (
                            <p className="text-gray-400 text-xs">
                              <span className="text-gray-500 mr-1">Matric:</span>
                              {app.matric_percentage ? `${app.matric_percentage}%` : `${app.student?.matric_obtained_marks}/${app.student?.matric_total_marks}`}
                            </p>
                          ) : null}
                          {!app.fsc_percentage && !app.matric_percentage && !app.student?.inter_obtained_marks && (
                            <span className="text-xs text-gray-500">Not recorded</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-cyan-400" />
                          <span className="text-sm font-medium text-white">
                            {docCount > 0 ? `${docCount} Uploaded` : '0 Uploaded'}
                          </span>
                          {docCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                              <Check className="h-2.5 w-2.5 mr-0.5" /> Ready
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          app.status === 'approved' || app.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          app.status === 'rejected' || app.status === 'dropped' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          app.status === 'under_review' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                          app.status === 'waitlisted' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {getStatusIcon(app.status)}
                          <span className="ml-1.5 capitalize">{app.status?.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedApplication(app);
                            setAdminRemarks(app.remarks || '');
                            setShowModal(true);
                          }}
                          className="flex items-center px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded-lg transition-all border border-cyan-500/30 text-xs font-medium"
                          title="View Application Details & Documents"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredApplications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {filteredApplications.length} applications
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#161616] rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto animate-scale-in border border-gray-800 shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 sticky top-0 bg-[#161616]/95 backdrop-blur z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">Application Details & Verification</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedApplication.status === 'approved' || selectedApplication.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    selectedApplication.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    selectedApplication.status === 'under_review' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {selectedApplication.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Applied on {new Date(selectedApplication.application_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Profile Card */}
              <div className="p-5 bg-[#0f0f0f] rounded-xl border border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-bold text-2xl">
                      {selectedApplication.student?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {selectedApplication.student?.full_name || 'N/A'}
                        {selectedApplication.student?.is_verified ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Profile Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            <AlertCircle className="h-3 w-3 mr-1" /> Pending Verification
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-gray-500" /> {selectedApplication.student?.email}</span>
                        <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-gray-500" /> <span className="font-mono">{selectedApplication.student?.cnic || 'N/A'}</span></span>
                        {selectedApplication.student?.phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-gray-500" /> {selectedApplication.student?.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Personal Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                  <div>
                    <span className="text-gray-500 block">Father's Name</span>
                    <span className="font-medium text-gray-200">{selectedApplication.student?.father_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Date of Birth</span>
                    <span className="font-medium text-gray-200">{selectedApplication.student?.date_of_birth || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Gender</span>
                    <span className="font-medium text-gray-200 capitalize">{selectedApplication.student?.gender || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Father / Alt Phone</span>
                    <span className="font-medium text-gray-200">{selectedApplication.student?.father_phone || selectedApplication.student?.alternate_phone || 'N/A'}</span>
                  </div>
                  {(selectedApplication.student?.address || selectedApplication.student?.permanent_address) && (
                    <div className="col-span-2 sm:col-span-4 mt-1">
                      <span className="text-gray-500 block">Address</span>
                      <span className="font-medium text-gray-300">{selectedApplication.student?.address || selectedApplication.student?.permanent_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Program & Application Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0f0f0f] rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Applied Program</span>
                  <p className="font-bold text-white text-base">{selectedApplication.program?.name || 'N/A'}</p>
                  <p className="text-sm text-cyan-400 mt-0.5">{selectedApplication.program?.department}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Min Required Percentage: <span className="font-semibold text-white">{selectedApplication.program?.min_percentage || 50}%</span>
                  </p>
                </div>
                <div className="p-4 bg-[#0f0f0f] rounded-xl border border-gray-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Application Fee Status</span>
                    <div className="flex items-center gap-3">
                      {selectedApplication.fee_status ? (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                          selectedApplication.fee_status === 'verified' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          selectedApplication.fee_status === 'submitted' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          Fee: {selectedApplication.fee_status}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700">
                          Fee: Unpaid
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedApplication.fee_challan?.challan_number && (
                    <p className="text-xs text-gray-400 mt-2 font-mono">
                      Challan #: {selectedApplication.fee_challan.challan_number}
                    </p>
                  )}
                </div>
              </div>

              {/* Academic Records Cards */}
              <div>
                <h4 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-400" />
                  Academic Qualifications
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Matric Card */}
                  <div className="p-4 bg-[#0f0f0f] rounded-xl border border-gray-800 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-yellow-400" />
                        <span className="font-semibold text-white text-sm">Matric / SSC Record</span>
                      </div>
                      {selectedApplication.student?.matric_obtained_marks && (
                        <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-xs font-bold">
                          {((selectedApplication.student.matric_obtained_marks / selectedApplication.student.matric_total_marks) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                      <div>
                        <span className="text-gray-500 block">Board / Institution</span>
                        <span className="font-medium text-gray-200">{selectedApplication.student?.matric_board || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Passing Year</span>
                        <span className="font-medium text-gray-200">{selectedApplication.student?.matric_passing_year || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500 block">Marks Obtained / Total</span>
                        <span className="font-semibold text-white">
                          {selectedApplication.student?.matric_obtained_marks ? (
                            `${selectedApplication.student.matric_obtained_marks} / ${selectedApplication.student.matric_total_marks || 1100}`
                          ) : (
                            selectedApplication.matric_percentage ? `${selectedApplication.matric_percentage}%` : 'N/A'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Intermediate Card */}
                  <div className="p-4 bg-[#0f0f0f] rounded-xl border border-gray-800 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-indigo-400" />
                        <span className="font-semibold text-white text-sm">Intermediate / HSSC Record</span>
                      </div>
                      {selectedApplication.student?.inter_obtained_marks && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-xs font-bold">
                          {((selectedApplication.student.inter_obtained_marks / selectedApplication.student.inter_total_marks) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                      <div>
                        <span className="text-gray-500 block">Board / Institution</span>
                        <span className="font-medium text-gray-200">{selectedApplication.student?.inter_board || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Passing Year</span>
                        <span className="font-medium text-gray-200">{selectedApplication.student?.inter_passing_year || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500 block">Marks Obtained / Total</span>
                        <span className="font-semibold text-white">
                          {selectedApplication.student?.inter_obtained_marks ? (
                            `${selectedApplication.student.inter_obtained_marks} / ${selectedApplication.student.inter_total_marks || 1100}`
                          ) : (
                            selectedApplication.fsc_percentage ? `${selectedApplication.fsc_percentage}%` : 'N/A'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Section (Core Feature) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    Uploaded Student Documents
                  </h4>
                  <span className="text-xs text-gray-400">
                    Click <strong>Preview</strong> on any document to inspect full file & OCR verification data
                  </span>
                </div>

                {(() => {
                  const docs = getAllApplicationDocuments(selectedApplication);
                  if (docs.length === 0) {
                    return (
                      <div className="p-8 bg-[#0f0f0f] rounded-xl border border-gray-800 text-center">
                        <AlertCircle className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                        <p className="font-medium text-gray-300">No documents uploaded yet</p>
                        <p className="text-xs text-gray-500 mt-1">The student has not uploaded any verification certificates or ID documents.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {docs.map((doc, idx) => {
                        const label = getDocTypeLabel(doc.type);
                        const hasPreview = !!(doc.file_data || doc.file_url || doc.url);
                        return (
                          <div
                            key={doc._id || idx}
                            className="p-4 bg-[#0f0f0f] rounded-xl border border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-lg bg-gray-800/80 border border-gray-700">
                                    {getDocIcon(doc.type)}
                                  </div>
                                  <div>
                                    <h5 className="font-semibold text-white text-sm">{label}</h5>
                                    <p className="text-xs text-gray-400 truncate max-w-[180px]" title={doc.name}>
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

                              {/* OCR Extracted preview chip if available */}
                              {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                                <div className="mt-3 p-2 bg-[#161616] rounded-lg border border-gray-800/80 text-[11px] text-gray-400 space-y-0.5">
                                  {doc.extracted_data.cnic && (
                                    <p><strong className="text-gray-300">CNIC:</strong> <span className="font-mono text-cyan-400">{doc.extracted_data.cnic}</span></p>
                                  )}
                                  {doc.extracted_data.name && (
                                    <p><strong className="text-gray-300">Name:</strong> {doc.extracted_data.name}</p>
                                  )}
                                  {doc.extracted_data.obtained_marks && (
                                    <p><strong className="text-gray-300">Marks:</strong> {doc.extracted_data.obtained_marks} / {doc.extracted_data.total_marks || 1100}</p>
                                  )}
                                  {doc.extracted_data.board && (
                                    <p><strong className="text-gray-300">Board:</strong> {doc.extracted_data.board}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-800/80">
                              <button
                                onClick={() => handleOpenDocViewer(doc)}
                                disabled={!hasPreview}
                                className="flex-1 inline-flex items-center justify-center px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded-lg transition-colors text-xs font-semibold border border-cyan-500/20 disabled:opacity-40"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                Preview Document
                              </button>
                              {hasPreview && (
                                <button
                                  onClick={() => handleDownloadDoc(doc)}
                                  className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700"
                                  title="Download / Open Original"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Personal Statement / Remarks */}
              {selectedApplication.personal_statement && (
                <div>
                  <h4 className="font-bold text-white text-base mb-2">Personal Statement</h4>
                  <p className="text-sm text-gray-300 bg-[#0f0f0f] p-4 rounded-xl border border-gray-800 whitespace-pre-wrap">
                    {selectedApplication.personal_statement}
                  </p>
                </div>
              )}

              {/* Admin Remarks Input */}
              <div>
                <h4 className="font-bold text-white text-sm mb-2">Admin Remarks / Notes</h4>
                <textarea
                  rows="2"
                  placeholder="Optional notes or reasons for approval / rejection (e.g. All documents verified successfully)..."
                  className="w-full p-3 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                />
              </div>

              {/* Decision Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Change Status:</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => updateStatus(selectedApplication.id || selectedApplication._id, 'approved', 'Application approved by administrator')}
                    disabled={updating || selectedApplication.status === 'approved' || selectedApplication.status === 'confirmed'}
                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Application
                  </button>
                  <button
                    onClick={() => updateStatus(selectedApplication.id || selectedApplication._id, 'under_review', 'Marked under administrative review')}
                    disabled={updating || selectedApplication.status === 'under_review'}
                    className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark Under Review
                  </button>
                  <button
                    onClick={() => updateStatus(selectedApplication.id || selectedApplication._id, 'rejected', 'Application rejected')}
                    disabled={updating || selectedApplication.status === 'rejected'}
                    className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-900/20"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#181818] rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col border border-gray-700 shadow-2xl overflow-hidden animate-scale-in">
            {/* Viewer Header */}
            <div className="p-4 border-b border-gray-800 bg-[#121212] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {getDocIcon(previewDoc.type)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {getDocTypeLabel(previewDoc.type)}
                    {previewDoc.confidence && (
                      <span className="text-xs font-normal text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        OCR Confidence: {Math.round(previewDoc.confidence)}%
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400">{previewDoc.name || 'Document File'}</p>
                </div>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                  className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-400 font-mono w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                  className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="flex items-center px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-xs font-semibold"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg transition-colors ml-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Viewer Body & OCR Sidebar */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Document Canvas Area */}
              <div className="flex-1 bg-[#0a0a0a] p-4 flex items-center justify-center overflow-auto relative">
                {(() => {
                  const src = previewDoc.file_data || previewDoc.file_url || previewDoc.url;
                  const isPdf = previewDoc.mime_type === 'application/pdf' ||
                    previewDoc.name?.toLowerCase().endsWith('.pdf') ||
                    (src && src.startsWith('data:application/pdf'));

                  if (!src) {
                    return (
                      <div className="text-center text-gray-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                        <p>No document preview available.</p>
                      </div>
                    );
                  }

                  if (isPdf) {
                    return (
                      <iframe
                        src={src}
                        title={previewDoc.name || 'PDF Document'}
                        className="w-full h-full rounded-xl border border-gray-800 bg-white shadow-2xl"
                      />
                    );
                  }

                  return (
                    <div
                      className="transition-transform duration-200 flex items-center justify-center"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center'
                      }}
                    >
                      <img
                        src={src}
                        alt={previewDoc.name || 'Document'}
                        className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl border border-gray-800"
                      />
                    </div>
                  );
                })()}
              </div>

              {/* OCR Information Sidebar */}
              {previewDoc.extracted_data && Object.keys(previewDoc.extracted_data).length > 0 && (
                <div className="w-full lg:w-80 bg-[#121212] border-t lg:border-t-0 lg:border-l border-gray-800 p-5 overflow-y-auto flex-shrink-0">
                  <div className="flex items-center gap-2 text-cyan-400 mb-4 font-bold text-sm pb-2 border-b border-gray-800">
                    <Sparkles className="h-4 w-4" />
                    OCR Extracted Key Details
                  </div>
                  <div className="space-y-3 text-xs">
                    {previewDoc.extracted_data.name && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">Applicant Name</span>
                        <span className="font-semibold text-white">{previewDoc.extracted_data.name}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.father_name && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">Father's Name</span>
                        <span className="font-semibold text-white">{previewDoc.extracted_data.father_name}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.cnic && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">CNIC / B-Form Number</span>
                        <span className="font-mono font-bold text-cyan-400">{previewDoc.extracted_data.cnic}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.date_of_birth && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">Date of Birth</span>
                        <span className="font-semibold text-white">{previewDoc.extracted_data.date_of_birth}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.gender && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">Gender</span>
                        <span className="font-semibold text-white capitalize">{previewDoc.extracted_data.gender}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.board && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">Board Name</span>
                        <span className="font-semibold text-white">{previewDoc.extracted_data.board}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.passing_year && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">Passing Year</span>
                        <span className="font-semibold text-white">{previewDoc.extracted_data.passing_year}</span>
                      </div>
                    )}
                    {previewDoc.extracted_data.obtained_marks !== undefined && previewDoc.extracted_data.obtained_marks !== null && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">Marks Obtained / Total</span>
                        <span className="font-bold text-emerald-400">
                          {previewDoc.extracted_data.obtained_marks} / {previewDoc.extracted_data.total_marks || 1100}
                          {previewDoc.extracted_data.total_marks && (
                            <span className="text-gray-400 ml-1 font-normal">
                              ({((previewDoc.extracted_data.obtained_marks / previewDoc.extracted_data.total_marks) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {previewDoc.extracted_data.address && (
                      <div className="p-2.5 bg-[#181818] rounded-lg border border-gray-800">
                        <span className="text-gray-500 block">Address</span>
                        <span className="text-gray-300">{previewDoc.extracted_data.address}</span>
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

export default AllApplications;

