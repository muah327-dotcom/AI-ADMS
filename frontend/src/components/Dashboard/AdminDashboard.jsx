import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Award,
  Loader2,
  ArrowRight,
  Download
} from 'lucide-react';
import SkeletonLoader from '../Common/SkeletonLoader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [statsRes, appsRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/all-applications?limit=5', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const statsData = await statsRes.json();
      const appsData = await appsRes.json();

      if (statsRes.ok) setStats(statsData.stats);
      if (appsRes.ok) setRecentApplications(appsData.applications || []);
    } catch (error) {
      console.error('Dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const admissionData = {
    labels: ['Merit', 'Quota', 'Self Finance'],
    datasets: [
      {
        data: [
          stats?.categoryDistribution?.merit || 0,
          stats?.categoryDistribution?.quota || 0,
          stats?.categoryDistribution?.self_finance || 0
        ],
        backgroundColor: ['#06b6d4', '#10b981', '#f59e0b'],
        borderWidth: 0,
      },
    ],
  };

  const programList = stats?.programDistribution || [];
  const programLabels = programList.map(p => p.name);
  const programCounts = programList.map(p => p.count);

  const monthlyData = {
    labels: programLabels.length > 0 ? programLabels : ['CS', 'SE', 'EE', 'BBA', 'BBIT', 'DS'],
    datasets: [
      {
        label: 'Applications per Program',
        data: programCounts.length > 0 ? programCounts : [12, 10, 9, 12, 9, 9],
        backgroundColor: '#06b6d4',
        borderRadius: 4,
      },
    ],
  };

  const programData = {
    labels: programLabels.length > 0 ? programLabels : ['BS CS', 'BS SE', 'BE EE', 'BBA', 'BBIT', 'BS DS'],
    datasets: [
      {
        data: programCounts.length > 0 ? programCounts : [12, 10, 9, 12, 9, 9],
        backgroundColor: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'],
        borderWidth: 0,
      },
    ],
  };

  if (loading) {
    return <SkeletonLoader variant="dashboard" theme="dark" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400">Manage admissions and view real-time analytics</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards - Dynamic DB Data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: stats?.totalApplications ?? 0, subtext: `${stats?.totalApplications || 0} Total Received`, icon: FileText, color: 'text-cyan-400' },
          { label: 'Admitted Students', value: stats?.admittedStudents ?? 0, subtext: `${stats?.confirmedApplications || 0} Paid Confirmed`, icon: Users, color: 'text-green-400' },
          { label: 'Admission Rate', value: `${stats?.admissionRate ?? 0}%`, subtext: `${stats?.admittedStudents || 0} of ${stats?.totalApplications || 0}`, icon: TrendingUp, color: 'text-cyan-400' },
          { label: 'Pending Review', value: stats?.pendingApplications ?? 0, subtext: `${stats?.waitlistedApplications || 0} Waitlisted`, icon: Clock, color: 'text-yellow-400' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-[#1a1a1a] rounded-xl p-5 border border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs mt-1 text-cyan-400 font-medium">
                    {stat.subtext}
                  </p>
                </div>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section - Dark Theme */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Application Trend */}
        <div className="lg:col-span-2 bg-[#1a1a1a] rounded-xl border border-gray-800 p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Application Trend</h2>
          <div className="relative w-full" style={{ height: '200px' }}>
            <Bar
              data={monthlyData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { 
                    beginAtZero: true, 
                    grid: { color: '#2a2a2a' }, 
                    ticks: { color: '#6b7280', font: { size: 11 } }
                  },
                  x: { 
                    grid: { display: false }, 
                    ticks: { color: '#6b7280', font: { size: 11 } }
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Admissions by Category */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Admissions by Category</h2>
          <div className="relative w-full" style={{ height: '200px' }}>
            <Doughnut
              data={admissionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'bottom', 
                    labels: { 
                      color: '#6b7280',
                      boxWidth: 12, 
                      font: { size: 11 },
                      padding: 15
                    } 
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Programs & Recent Applications - Dark Theme */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Program Distribution */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">By Program</h2>
          <div className="relative w-full" style={{ height: '280px' }}>
            <Pie
              data={programData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'bottom', 
                    labels: { 
                      color: '#6b7280',
                      boxWidth: 12, 
                      font: { size: 11 },
                      padding: 10
                    } 
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-[#1a1a1a] rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-300">Recent Applications</h2>
              <Link to="/admin/applications" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-800">
            {recentApplications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No applications yet</div>
            ) : (
              recentApplications.slice(0, 4).map((app) => (
                <div key={app.id} className="p-3 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {app.student?.full_name ? (
                        <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                          <span className="text-blue-400 font-semibold text-sm">
                            {app.student.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <Users className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{app.student?.full_name || 'Unknown Student'}</p>
                        <p className="text-xs text-gray-500">{app.program?.name}</p>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
