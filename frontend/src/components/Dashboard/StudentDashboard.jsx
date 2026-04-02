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
  Loader2
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
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
        setRecentApplications(appsData.applications?.slice(0, 5) || []);
        const apps = appsData.applications || [];
        setStats({
          total: apps.length,
          pending: apps.filter(a => a.status === 'pending').length,
          approved: apps.filter(a => a.status === 'approved').length,
          rejected: apps.filter(a => a.status === 'rejected').length
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
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 lg:p-8 text-white">
        <h1 className="text-2xl lg:text-3xl font-bold">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
        <p className="mt-2 text-primary-100">
          Manage your applications, check your eligibility, and track your admission status all in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/applications/new" className="inline-flex items-center px-4 py-2 bg-white text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition-colors">
            <FileText className="h-4 w-4 mr-2" />
            New Application
          </Link>
          <Link to="/recommendations" className="inline-flex items-center px-4 py-2 bg-primary-700 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
            <Sparkles className="h-4 w-4 mr-2" />
            Get Recommendations
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: stats?.total || 0, icon: FileText, color: 'blue' },
          { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'yellow' },
          { label: 'Approved', value: stats?.approved || 0, icon: CheckCircle, color: 'green' },
          { label: 'Rejected', value: stats?.rejected || 0, icon: AlertCircle, color: 'red' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600',
            yellow: 'bg-yellow-50 text-yellow-600',
            green: 'bg-green-50 text-green-600',
            red: 'bg-red-50 text-red-600'
          };
          return (
            <div key={index} className="bg-white rounded-xl p-4 lg:p-6 shadow-sm card-hover">
              <div className={`inline-flex p-3 rounded-lg ${colorClasses[stat.color]}`}>
                <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <p className="mt-4 text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
              <Link to="/applications" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentApplications.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No applications yet</p>
                <Link to="/applications/new" className="mt-2 text-primary-600 hover:text-primary-700 text-sm">
                  Submit your first application
                </Link>
              </div>
            ) : (
              recentApplications.map((app) => (
                <div key={app.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(app.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{app.programs?.name}</p>
                        <p className="text-xs text-gray-500">{app.programs?.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(app.status)}`}>
                        {app.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
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
          {/* AI Recommendations */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
              AI Recommendations
            </h2>
            {recommendations.length === 0 ? (
              <p className="text-sm text-gray-500">Upload your documents to get personalized recommendations</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{rec.name}</p>
                      <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                        {rec.match_score}% match
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{rec.department}</p>
                  </div>
                ))}
                <Link to="/recommendations" className="text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center mt-2">
                  View All Recommendations
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/documents" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Upload className="h-5 w-5 text-primary-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload Documents</p>
                  <p className="text-xs text-gray-500">CNIC & academic records</p>
                </div>
              </Link>
              <Link to="/merit-list" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Award className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Check Merit List</p>
                  <p className="text-xs text-gray-500">View your ranking</p>
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
