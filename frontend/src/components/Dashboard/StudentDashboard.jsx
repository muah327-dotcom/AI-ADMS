import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  FileText,
  Sparkles,
  Upload,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  CreditCard,
  Bell
} from 'lucide-react';
import SkeletonLoader from '../Common/SkeletonLoader';
import { useTheme } from '../../contexts/ThemeContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');

      const [appsRes, recsRes] = await Promise.all([
        fetch('/api/applications/my-applications', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/recommendations/best-fit?limit=3', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const appsData = await appsRes.json();
      const recsData = await recsRes.json();

      if (appsRes.ok) {
        setRecentApplications(appsData.applications || []);
        const apps = appsData.applications || [];
        setStats({
          total: apps.length,
          pending: apps.filter(a => a.status === 'pending').length,
          approved: apps.filter(a => a.status === 'approved' || a.status === 'confirmed').length,
          rejected: apps.filter(a => a.status === 'rejected' || a.status === 'dropped').length
        });
      }

      if (recsRes.ok) {
        setRecommendations(recsData.bestFit || []);
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedApp = recentApplications.find(a => a.status === 'approved');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
      case 'dropped':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'rejected':
      case 'dropped':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'pending':
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    }
  };

  if (loading) {
    return <SkeletonLoader variant="dashboard" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Selected Student Fee Challan Notification Banner */}
      {selectedApp && (
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl p-6 text-white shadow-xl border border-green-400/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-white dark:bg-gray-800/20 rounded-xl backdrop-blur-sm">
              <Bell className="h-8 w-8 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🎉 Congratulations! You are Selected!
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                You have been selected for <span className="font-semibold text-white">{selectedApp.programs?.name}</span>. Download your fee challan, deposit at bank, and upload the paid receipt before the deadline to confirm your seat!
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/fee-challan"
            className="px-5 py-2.5 bg-yellow-400 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-yellow-300 transition-colors shadow-lg flex items-center whitespace-nowrap"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            View & Print Fee Challan
          </Link>
        </div>
      )}

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-2xl p-6 lg:p-8 text-white">
        <h1 className="text-2xl lg:text-3xl font-bold">Welcome, {user?.full_name?.split(' ')[0]}!</h1>
        <p className="mt-2 text-cyan-100">
          Manage your applications, check your eligibility, and track your admission status all in one place.
        </p>
        <div className="mt-4 flex items-center gap-2 bg-white dark:bg-gray-800/15 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-white/20">
          <Upload className="h-4 w-4 text-amber-500 dark:text-yellow-300 flex-shrink-0" />
          <p className="text-sm text-gray-700 dark:text-white">
            <span className="font-semibold text-amber-600 dark:text-yellow-300">Verification Required:</span> Non-optional documents (CNIC, Photograph, Matric & Intermediate certificates) are mandatory.{' '}
            <Link to="/dashboard/documents" className="underline font-semibold text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-yellow-200 transition-colors">
              Upload all mandatory documents
            </Link>{' '}
            to verify your profile and enable application submission.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/dashboard/applications/new" className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-cyan-700 rounded-lg font-medium hover:bg-cyan-50 transition-colors">
            <FileText className="h-4 w-4 mr-2" />
            New Application
          </Link>
          <Link to="/dashboard/recommendations" className="inline-flex items-center px-4 py-2 bg-cyan-700 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors border border-cyan-500/30">
            <Sparkles className="h-4 w-4 mr-2" />
            Get Recommendations
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: stats?.total || 0, icon: FileText, color: 'cyan' },
          { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'yellow' },
          { label: 'Approved', value: stats?.approved || 0, icon: CheckCircle, color: 'green' },
          { label: 'Rejected', value: stats?.rejected || 0, icon: AlertCircle, color: 'red' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            green: 'bg-green-500/10 text-green-400 border-green-500/20',
            red: 'bg-red-500/10 text-red-400 border-red-500/20'
          };
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-300 shadow-sm transition-colors">
              <div className={`inline-flex p-3 rounded-lg border ${colorClasses[stat.color]}`}>
                <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <p className="mt-4 text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Applications</h2>
              <Link to="/dashboard/applications" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentApplications.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No applications yet</p>
                <Link to="/dashboard/applications/new" className="mt-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm">
                  Submit your first application
                </Link>
              </div>
            ) : (
              recentApplications.map((app) => (
                <div key={app.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(app.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{app.programs?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{app.programs?.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${app.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          app.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                            app.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                              'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                        }`}>
                        {app.status}
                      </span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(app.application_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions & Recommendations */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/dashboard/documents" className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700">
                <Upload className="h-5 w-5 text-primary-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Upload Documents</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">CNIC & academic records</p>
                </div>
              </Link>
              <Link to="/dashboard/merit-list" className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700">
                <Award className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Check Merit List</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">View your ranking</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
