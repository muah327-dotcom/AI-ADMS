import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Trash2,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import SkeletonLoader from '../Common/SkeletonLoader';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // holds app to delete
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/applications/my-applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Fetch applications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
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
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleDelete = async (app) => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/applications/${app.id || app._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Application deleted successfully');
        setApplications(prev => prev.filter(a => (a.id || a._id) !== (app.id || app._id)));
        setDeleteConfirm(null);
      } else {
        toast.error(data.error || 'Failed to delete application');
      }
    } catch (error) {
      toast.error('An error occurred while deleting');
    } finally {
      setDeleting(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.programs?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.programs?.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return     <SkeletonLoader variant="list" theme="light" />;
  }

  return (
    <>
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500 mt-1">Track and manage your admission applications</p>
        </div>
        <Link
          to="/dashboard/applications/new"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Application
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by program or department..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900"
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
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500 mb-4">
              {applications.length === 0 
                ? "You haven't submitted any applications yet." 
                : "No applications match your search criteria."}
            </p>
            {applications.length === 0 && (
              <Link
                to="/dashboard/applications/new"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Submit First Application
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredApplications.map((app) => (
              <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary-50 rounded-lg">
                      <FileText className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{app.programs?.name}</h3>
                      <p className="text-sm text-gray-500">{app.programs?.department}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Applied: {new Date(app.application_date).toLocaleDateString()}</span>
                        {app.merit_rank && (
                          <span className="text-primary-600 font-medium">Merit Rank: #{app.merit_rank}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(app.status)}`}>
                      {getStatusIcon(app.status)}
                      <span className="ml-2 capitalize">{app.status.replace('_', ' ')}</span>
                    </span>
                    {app.admission_category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-600">
                        {app.admission_category}
                      </span>
                    )}
                    <Link
                      to={`/dashboard/applications/track/${app.id}`}
                      className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
                      title="Track Application"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(app)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete Application"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Application</h3>
            </div>
            <p className="text-gray-500 mb-2">
              Are you sure you want to delete your application for:
            </p>
            <p className="text-gray-900 font-medium mb-1">{deleteConfirm.programs?.name}</p>
            <p className="text-sm text-gray-500 mb-6">{deleteConfirm.programs?.department}</p>
            <p className="text-xs text-red-600 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-500 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Applications;
