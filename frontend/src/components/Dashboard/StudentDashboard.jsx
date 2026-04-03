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
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-2xl p-6 lg:p-8 text-white">
        <h1 className="text-2xl lg:text-3xl font-bold">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
        <p className="mt-2 text-cyan-100">
          Manage your applications, check your eligibility, and track your admission status all in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/dashboard/applications/new" className="inline-flex items-center px-4 py-2 bg-white text-cyan-700 rounded-lg font-medium hover:bg-cyan-50 transition-colors">
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
            <div key={index} className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800 hover:border-gray-700 transition-colors">
              <div className={`inline-flex p-3 rounded-lg border ${colorClasses[stat.color]}`}>
                <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              <p className="mt-4 text-2xl lg:text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-[#1a1a1a] rounded-xl border border-gray-800">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Applications</h2>
              <Link to="/dashboard/applications" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-800">
            {recentApplications.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No applications yet</p>
                <Link to="/dashboard/applications/new" className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm">
                  Submit your first application
                </Link>
              </div>
            ) : (
              recentApplications.map((app) => (
                <div key={app.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(app.status)}
                      <div>
                        <p className="text-sm font-medium text-white">{app.programs?.name}</p>
                        <p className="text-xs text-gray-400">{app.programs?.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
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
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-400" />
              AI Recommendations
            </h2>
            {recommendations.length === 0 ? (
              <p className="text-sm text-gray-400">Upload your documents to get personalized recommendations</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{rec.name}</p>
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                        {rec.match_score}% match
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{rec.department}</p>
                  </div>
                ))}
                <Link to="/dashboard/recommendations" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center justify-center mt-2">
                  View All Recommendations
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/dashboard/documents" className="flex items-center p-3 bg-[#0f0f0f] rounded-lg hover:bg-gray-800/50 transition-colors border border-gray-800">
                <Upload className="h-5 w-5 text-cyan-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">Upload Documents</p>
                  <p className="text-xs text-gray-400">CNIC & academic records</p>
                </div>
              </Link>
              <Link to="/dashboard/merit-list" className="flex items-center p-3 bg-[#0f0f0f] rounded-lg hover:bg-gray-800/50 transition-colors border border-gray-800">
                <Award className="h-5 w-5 text-green-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-white">Check Merit List</p>
                  <p className="text-xs text-gray-400">View your ranking</p>
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
