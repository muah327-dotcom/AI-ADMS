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
  MoreHorizontal,
  FileText
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
      const response = await fetch(`/api/admin/applications/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        toast.success(`Application ${status.replace('_', ' ')} successfully`);
        fetchApplications();
        setShowModal(false);
        setSelectedApplication(null);
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
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'under_review':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'waitlisted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const filteredApplications = applications.filter(app =>
    app.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.program?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">All Applications</h1>
          <p className="text-gray-500 mt-1">Review and manage all student applications</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          <Download className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, email or program..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="waitlisted">Waitlisted</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
            >
              <option value="all">All Programs</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                          <span className="text-primary-700 font-semibold">
                            {app.student?.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{app.student?.full_name}</p>
                          <p className="text-sm text-gray-500">{app.student?.email}</p>
                          <p className="text-xs text-gray-400">{app.student?.cnic}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{app.program?.name}</p>
                      <p className="text-sm text-gray-500">{app.program?.department}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(app.application_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(app.status)}`}>
                        {getStatusIcon(app.status)}
                        <span className="ml-2 capitalize">{app.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { setSelectedApplication(app); setShowModal(true); }}
                        className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredApplications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredApplications.length} applications
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Application Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-2xl text-primary-700 font-bold">
                    {selectedApplication.student?.full_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedApplication.student?.full_name}</h3>
                  <p className="text-gray-500">{selectedApplication.student?.email}</p>
                  <p className="text-sm text-gray-400">{selectedApplication.student?.cnic}</p>
                </div>
              </div>

              {/* Application Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Program</p>
                  <p className="font-medium text-gray-900">{selectedApplication.program?.name}</p>
                  <p className="text-sm text-gray-500">{selectedApplication.program?.department}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Priority</p>
                  <p className="font-medium text-gray-900">{selectedApplication.priority}</p>
                </div>
              </div>

              {/* Academic Records */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Academic Records</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <pre className="text-sm text-gray-700 overflow-auto max-h-48">
                    {JSON.stringify(selectedApplication.academic_records, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Documents */}
              {selectedApplication.documents?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Uploaded Documents</h4>
                  <div className="space-y-2">
                    {selectedApplication.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-700">{doc.name || `Document ${idx + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Statement */}
              {selectedApplication.personal_statement && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Personal Statement</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedApplication.personal_statement}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {selectedApplication.status !== 'approved' && (
                  <button
                    onClick={() => updateStatus(selectedApplication.id, 'approved', 'Application approved by admin')}
                    disabled={updating}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </button>
                )}
                {selectedApplication.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(selectedApplication.id, 'rejected', 'Application rejected by admin')}
                    disabled={updating}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </button>
                )}
                {selectedApplication.status !== 'under_review' && (
                  <button
                    onClick={() => updateStatus(selectedApplication.id, 'under_review', 'Application under review')}
                    disabled={updating}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark Under Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllApplications;
