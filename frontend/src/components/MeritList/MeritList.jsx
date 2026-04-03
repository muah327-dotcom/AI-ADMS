import React, { useEffect, useState } from 'react';
import {
  Award,
  Download,
  Loader2,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Crown,
  Star,
  Users,
  Calendar
} from 'lucide-react';

const MeritList = ({ admin = false }) => {
  const [meritList, setMeritList] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ selected: 0, waitlisted: 0 });

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      fetchMeritList(selectedProgram);
    }
  }, [selectedProgram, categoryFilter]);

  const fetchPrograms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/applications/programs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
        if (data.programs?.length > 0) {
          setSelectedProgram(data.programs[0].id);
        }
      }
    } catch (error) {
      console.error('Fetch programs error:', error);
    }
  };

  const fetchMeritList = async (programId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = admin 
        ? `/api/merit/program/${programId}?category=${categoryFilter}`
        : `/api/merit/program/${programId}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const list = data.meritList || [];
        setMeritList(list);
        setStats({
          selected: list.filter(e => e.status === 'selected').length,
          waitlisted: list.filter(e => e.status === 'waitlisted').length
        });
      }
    } catch (error) {
      console.error('Fetch merit list error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMeritList = async () => {
    if (!selectedProgram) return;
    
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/merit/generate/${selectedProgram}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quota_percentages: { merit: 80, quota: 10, self_finance: 10 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        fetchMeritList(selectedProgram);
        alert(`Merit list generated successfully!\nSelected: ${data.selected}\nWaitlisted: ${data.waitlisted}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate merit list');
      }
    } catch (error) {
      console.error('Generate merit list error:', error);
      alert('Error generating merit list');
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'merit':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'quota':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'self_finance':
        return <Users className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'merit':
        return 'bg-yellow-100 text-yellow-800';
      case 'quota':
        return 'bg-blue-100 text-blue-800';
      case 'self_finance':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedProgramData = programs.find(p => p.id === selectedProgram);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Merit List</h1>
          <p className="text-gray-400 mt-1">View program-wise merit rankings and admissions</p>
        </div>
        {admin && (
          <div className="flex gap-3">
            <button
              onClick={generateMeritList}
              disabled={generating || !selectedProgram}
              className="inline-flex items-center px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Generating...
                </>
              ) : (
                <>
                  <Award className="h-5 w-5 mr-2" />
                  Generate Merit List
                </>
              )}
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-400 mb-1 block">Select Program</label>
            <select
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </div>
          {admin && (
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">Category Filter</label>
              <select
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="merit">Merit</option>
                <option value="quota">Quota</option>
                <option value="self_finance">Self Finance</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Program Info */}
      {selectedProgramData && (
        <div className="bg-cyan-500/10 rounded-xl p-6 border border-cyan-500/20">
          <h3 className="text-lg font-semibold text-white">{selectedProgramData.name}</h3>
          <p className="text-gray-400">{selectedProgramData.department}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="bg-[#1a1a1a] rounded-lg p-3 text-center border border-gray-800">
              <p className="text-2xl font-bold text-white">{selectedProgramData.total_seats}</p>
              <p className="text-xs text-gray-400">Total Seats</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-3 text-center border border-gray-800">
              <p className="text-2xl font-bold text-green-400">{stats.selected}</p>
              <p className="text-xs text-gray-400">Selected</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-3 text-center border border-gray-800">
              <p className="text-2xl font-bold text-yellow-400">{stats.waitlisted}</p>
              <p className="text-xs text-gray-400">Waitlisted</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-3 text-center border border-gray-800">
              <p className="text-2xl font-bold text-cyan-400">
                {meritList.length > 0 ? Math.round(meritList.reduce((a, b) => a + b.score, 0) / meritList.length) : 0}%
              </p>
              <p className="text-xs text-gray-400">Avg Score</p>
            </div>
          </div>
        </div>
      )}

      {/* Merit List Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : meritList.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Merit List Available</h3>
            <p className="text-gray-400">
              {admin 
                ? "Generate a merit list to see the rankings" 
                : "Merit list has not been published yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {meritList.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        entry.rank <= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center mr-3 border border-cyan-500/20">
                          <span className="text-cyan-400 font-semibold text-sm">
                            {entry.student?.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{entry.student?.full_name}</p>
                          <p className="text-sm text-gray-400">{entry.student?.cnic}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        entry.category === 'merit' ? 'bg-yellow-500/20 text-yellow-400' :
                        entry.category === 'quota' ? 'bg-cyan-500/20 text-cyan-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {getCategoryIcon(entry.category)}
                        <span className="ml-2 capitalize">{entry.category.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-1 w-24 h-2 bg-gray-700 rounded-full overflow-hidden mr-3">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${entry.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-white">{entry.score.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        entry.status === 'selected' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {entry.status === 'selected' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeritList;
