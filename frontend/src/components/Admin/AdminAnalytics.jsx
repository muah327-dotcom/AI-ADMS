import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Download,
  Calendar,
  Loader2,
  Filter,
  RefreshCw
} from 'lucide-react';
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

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [analyticsData, setAnalyticsData] = useState({
    categoryData: null,
    programData: null,
    performanceData: null,
    monthlyData: null,
    occupancyData: null
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const [categoryRes, programRes, performanceRes, monthlyRes, occupancyRes] = await Promise.all([
        fetch('/api/analytics/admissions-by-category', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/analytics/applications-by-program', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/analytics/performance-insights', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/analytics/monthly-trends', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/analytics/seat-occupancy', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const data = {};
      if (categoryRes.ok) data.categoryData = await categoryRes.json();
      if (programRes.ok) data.programData = await programRes.json();
      if (performanceRes.ok) data.performanceData = await performanceRes.json();
      if (monthlyRes.ok) data.monthlyData = await monthlyRes.json();
      if (occupancyRes.ok) data.occupancyData = await occupancyRes.json();

      setAnalyticsData(data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryChartData = {
    labels: analyticsData.categoryData?.data?.map(d => d.category.charAt(0).toUpperCase() + d.category.slice(1)) || [],
    datasets: [
      {
        data: analyticsData.categoryData?.data?.map(d => d.count) || [],
        backgroundColor: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  const programChartData = {
    labels: analyticsData.programData?.data?.map(d => d.program) || [],
    datasets: [
      {
        label: 'Applications',
        data: analyticsData.programData?.data?.map(d => d.count) || [],
        backgroundColor: '#06b6d4',
        borderRadius: 6,
      },
    ],
  };

  const performanceChartData = {
    labels: analyticsData.performanceData?.percentageDistribution?.map(d => d.range) || [],
    datasets: [
      {
        label: 'Students',
        data: analyticsData.performanceData?.percentageDistribution?.map(d => d.count) || [],
        backgroundColor: ['#10b981', '#06b6d4', '#f59e0b', '#f97316', '#ef4444'],
        borderRadius: 6,
      },
    ],
  };

  const monthlyChartData = {
    labels: analyticsData.monthlyData?.data?.map(d => d.month) || [],
    datasets: [
      {
        label: 'Applications',
        data: analyticsData.monthlyData?.data?.map(d => d.count) || [],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Approved',
        data: analyticsData.monthlyData?.data?.map(d => d.approved) || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header - Dark Theme */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Comprehensive insights into admissions and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="p-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg bg-[#1a1a1a]"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button className="inline-flex items-center px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors text-sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards - Dark Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { 
            label: 'Total Applications', 
            value: analyticsData.categoryData?.total || 0, 
            subtext: '+12%',
            icon: BarChart3, 
            color: 'text-cyan-400' 
          },
          { 
            label: 'Processed', 
            value: analyticsData.performanceData?.totalApplications || 0, 
            subtext: '+8%',
            icon: TrendingUp, 
            color: 'text-green-400' 
          },
          { 
            label: 'Active Programs', 
            value: analyticsData.programData?.data?.length || 0, 
            subtext: '+5%',
            icon: PieChart, 
            color: 'text-purple-400' 
          },
          { 
            label: 'Avg. Occupancy', 
            value: `${Math.round(
              (analyticsData.occupancyData?.data?.reduce((a, b) => a + parseFloat(b.occupancyRate), 0) || 0) /
              (analyticsData.occupancyData?.data?.length || 1)
            )}%`, 
            subtext: '+15%',
            icon: Users, 
            color: 'text-orange-400' 
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.subtext.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.subtext}
                  </p>
                </div>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 - Dark Theme */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly Trends */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Monthly Trends</h3>
          <div className="relative w-full h-32">
            <Line
              data={monthlyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'bottom',
                    labels: { color: '#6b7280', boxWidth: 10, font: { size: 10 } }
                  },
                },
                scales: {
                  y: { 
                    beginAtZero: true, 
                    grid: { color: '#2a2a2a' },
                    ticks: { color: '#6b7280', font: { size: 10 } }
                  },
                  x: { 
                    grid: { display: false },
                    ticks: { color: '#6b7280', font: { size: 10 } }
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Admissions by Category</h3>
          <div className="relative w-full h-32">
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'bottom',
                    labels: { color: '#6b7280', boxWidth: 10, font: { size: 10 }, padding: 10 }
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Charts Row 2 - Dark Theme */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Program Distribution */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Applications by Program</h3>
          <div className="relative w-full h-32">
            <Bar
              data={programChartData}
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
                    ticks: { color: '#6b7280', font: { size: 10 } }
                  },
                  x: { 
                    grid: { display: false },
                    ticks: { color: '#6b7280', font: { size: 10 } }
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Performance Distribution</h3>
          <div className="h-32">
            <Bar
              data={performanceChartData}
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
                    ticks: { color: '#6b7280', font: { size: 10 } }
                  },
                  x: { 
                    grid: { display: false },
                    ticks: { color: '#6b7280', font: { size: 10 } }
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Seat Occupancy Table - Dark Theme */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">Program Seat Occupancy</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0f0f0f]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avail</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {analyticsData.occupancyData?.data?.slice(0, 5).map((item, index) => (
                <tr key={index} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white text-sm">{item.program}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{item.totalSeats}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{item.filled}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{item.available}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="flex-1 w-20 h-2 bg-gray-700 rounded-full overflow-hidden mr-2">
                        <div
                          className={`h-full rounded-full ${
                            parseFloat(item.occupancyRate) >= 90 ? 'bg-green-500' :
                            parseFloat(item.occupancyRate) >= 70 ? 'bg-cyan-500' :
                            parseFloat(item.occupancyRate) >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${item.occupancyRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-white">{item.occupancyRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
