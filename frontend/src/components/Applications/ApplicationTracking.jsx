import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  FileCheck,
  UserCheck,
  XCircle
} from 'lucide-react';
import SkeletonLoader from '../Common/SkeletonLoader';

const ApplicationTracking = () => {
  const { id } = useParams();
  const [tracking, setTracking] = useState([]);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrackingData();
  }, [id]);

  const fetchTrackingData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [trackingRes, appsRes] = await Promise.all([
        fetch(`/api/applications/tracking/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/applications/my-applications', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (trackingRes.ok) {
        const data = await trackingRes.json();
        setTracking(data.tracking || []);
      }

      if (appsRes.ok) {
        const data = await appsRes.json();
        const app = data.applications?.find(a => a.id === id);
        setApplication(app);
      }
    } catch (error) {
      console.error('Fetch tracking error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <Package className="h-5 w-5" />;
      case 'documents_verified':
        return <FileCheck className="h-5 w-5" />;
      case 'under_review':
        return <Clock className="h-5 w-5" />;
      case 'approved':
        return <UserCheck className="h-5 w-5" />;
      case 'rejected':
        return <XCircle className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-500';
      case 'documents_verified':
        return 'bg-purple-500';
      case 'under_review':
        return 'bg-yellow-500';
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return <SkeletonLoader variant="card" theme="light" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard/applications" className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Application Tracking</h1>
          <p className="text-gray-500 dark:text-gray-400">Track your application status in real-time</p>
        </div>
      </div>

      {/* Application Summary */}
      {application && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{application.programs?.name}</h2>
              <p className="text-gray-500 dark:text-gray-400">{application.programs?.department}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Applied on {new Date(application.application_date).toLocaleDateString()}
              </p>
            </div>
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              application.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' :
              application.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800' :
              application.status === 'under_review' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800' :
              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
            }`}>
              {application.status === 'approved' && <CheckCircle className="h-4 w-4 mr-2" />}
              {application.status === 'rejected' && <AlertCircle className="h-4 w-4 mr-2" />}
              {application.status === 'under_review' && <Clock className="h-4 w-4 mr-2" />}
              {application.status === 'pending' && <Clock className="h-4 w-4 mr-2" />}
              {application.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          
          {application.merit_rank && (
            <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-600 dark:text-primary-400">
                <span className="font-semibold">Merit Rank: #{application.merit_rank}</span>
                {application.admission_category && (
                  <span className="ml-2">| Category: {application.admission_category}</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Application Timeline</h3>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          
          <div className="space-y-6">
            {tracking.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No tracking information available</p>
            ) : (
              tracking.map((item, index) => (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Status dot */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${getStatusColor(item.status)} text-white shadow-lg`}>
                    {getStatusIcon(item.status)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                        {item.status.replace('_', ' ')}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-yellow-500/10 rounded-xl p-6 border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-400">Need Help?</h4>
            <p className="text-sm text-yellow-300/80 mt-1">
              If you have any questions about your application status, please contact the admissions office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationTracking;
