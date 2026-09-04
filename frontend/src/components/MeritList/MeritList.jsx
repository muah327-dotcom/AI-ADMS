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
  Calendar,
  CreditCard,
  RefreshCw,
  Eye,
  Check,
  X,
  Clock,
  DollarSign,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from '../Common/SkeletonLoader';

const MeritList = ({ admin = false }) => {
  const [meritList, setMeritList] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [programDetails, setProgramDetails] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showFeeConfig, setShowFeeConfig] = useState(false);
  const [showPreviousListsModal, setShowPreviousListsModal] = useState(false);
  const [stats, setStats] = useState({ selected: 0, waitlisted: 0, confirmed: 0, dropped: 0 });

  // Fee Config Form State
  const [feeForm, setFeeForm] = useState({
    admission_fee: 15000,
    tuition_fee: 65000,
    bank_name: 'Habib Bank Limited (HBL)',
    account_number: 'PK78HABB00012345678901',
    account_title: 'University Admission Office',
    fee_deadline: ''
  });

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
        const progList = data.programs || [];
        setPrograms(progList);
        if (progList.length > 0) {
          const defaultVal = progList[0]._id || progList[0].id || progList[0].name;
          setSelectedProgram(defaultVal);
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
        setProgramDetails(data.program || null);
        if (data.program) {
          setFeeForm({
            admission_fee: data.program.admission_fee || 15000,
            tuition_fee: data.program.tuition_fee || 65000,
            bank_name: data.program.bank_name || 'Habib Bank Limited (HBL)',
            account_number: data.program.account_number || 'PK78HABB00012345678901',
            account_title: data.program.account_title || 'University Admission Office',
            fee_deadline: data.program.fee_deadline ? new Date(data.program.fee_deadline).toISOString().split('T')[0] : ''
          });
        }
        setStats({
          selected: list.filter(e => e.status === 'selected').length,
          confirmed: list.filter(e => e.status === 'confirmed').length,
          waitlisted: list.filter(e => e.status === 'waitlisted').length,
          dropped: list.filter(e => e.status === 'dropped').length
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
          quota_percentages: { merit: 80, quota: 10, self_finance: 10 },
          fee_deadline: feeForm.fee_deadline
        })
      });

      if (response.ok) {
        const data = await response.json();
        fetchMeritList(selectedProgram);
        toast.success(`1st Merit list generated!\nSelected: ${data.selected}, Waitlisted: ${data.waitlisted}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate merit list');
      }
    } catch (error) {
      console.error('Generate merit list error:', error);
      toast.error('Error generating merit list');
    } finally {
      setGenerating(false);
    }
  };

  const generateNextMeritList = async () => {
    if (!selectedProgram) return;

    setGeneratingNext(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/merit/generate-next/${selectedProgram}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fee_deadline: feeForm.fee_deadline
        })
      });

      if (response.ok) {
        const data = await response.json();
        fetchMeritList(selectedProgram);
        toast.success(`${getOrdinal(data.meritListNumber)} Merit List Generated!\nDropped Unpaid: ${data.droppedUnpaidCount}, Promoted: ${data.promotedWaitlistedCount}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate merit list');
      }
    } catch (error) {
      console.error('Generate next merit list error:', error);
      toast.error('Error generating next merit list');
    } finally {
      setGeneratingNext(false);
    }
  };

  const resetMeritLists = async () => {
    if (!selectedProgram) return;

    if (!window.confirm('Are you sure you want to reset all merit lists for this program? This will set all applicants back to pending status.')) {
      return;
    }

    setResetting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/merit/reset-merit/${selectedProgram}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Merit lists reset successfully');
        fetchMeritList(selectedProgram);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reset merit lists');
      }
    } catch (error) {
      console.error('Reset merit lists error:', error);
      toast.error('Error resetting merit lists');
    } finally {
      setResetting(false);
    }
  };

  const exportToCSV = (listNumber) => {
    const filteredList = meritList.filter(entry => entry.merit_list_number <= listNumber);
    
    if (filteredList.length === 0) {
      toast.error(`No students found for Merit List #${listNumber}`);
      return;
    }

    const headers = ['Rank', 'Student Name', 'CNIC', 'Category', 'Score', 'Status', 'Fee Status', 'List Number'];
    
    const csvContent = [
      headers.join(','),
      ...filteredList.map(e => [
        e.rank,
        `"${e.student?.full_name || ''}"`,
        e.student?.cnic || '',
        e.category,
        e.score,
        e.status,
        e.fee_status,
        e.merit_list_number
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedProgramData?.name || 'Program'}_Merit_List_${listNumber}.csv`;
    link.click();
    toast.success(`Merit List #${listNumber} exported successfully`);
  };

  const getOrdinal = (n) => {
    if (!n || isNaN(n)) return '';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const handleSaveFeeConfig = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/merit/program-fee/${selectedProgram}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feeForm)
      });
      if (res.ok) {
        toast.success('Fee configuration saved');
        setShowFeeConfig(false);
        fetchMeritList(selectedProgram);
      } else {
        toast.error('Failed to save fee configuration');
      }
    } catch (err) {
      console.error('Save fee config error:', err);
      toast.error('Error saving fee configuration');
    }
  };

  const handleVerifyFee = async (applicationId, action) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/merit/verify-fee/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        toast.success(action === 'verify' ? 'Fee verified & admission confirmed!' : 'Fee receipt rejected');
        fetchMeritList(selectedProgram);
      } else {
        toast.error('Failed to update fee verification status');
      }
    } catch (err) {
      console.error('Verify fee error:', err);
      toast.error('Error updating fee status');
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

  const selectedProgramData = programs.find(p => (p._id || p.id || p.name) === selectedProgram);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Merit List
            {programDetails?.current_merit_list && (
              <span className="text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800 px-3 py-1 rounded-full font-mono">
                Merit List #{programDetails.current_merit_list}
              </span>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View program-wise merit rankings, fee statuses, and admissions</p>
        </div>
        {admin && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowFeeConfig(!showFeeConfig)}
              className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <DollarSign className="h-5 w-5 mr-2 text-green-400" />
              Configure Fee & Deadline
            </button>

            {programDetails?.current_merit_list > 0 && (
              <button
                onClick={() => setShowPreviousListsModal(true)}
              className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <History className="h-5 w-5 mr-2 text-primary-600" />
                View Merit Lists
              </button>
            )}

            {/* Single Dynamic Action Button: 1st Merit List -> 2nd -> 3rd -> Reset */}
            {(() => {
              const currentListNum = programDetails?.current_merit_list || 0;
              const isFirstGen = currentListNum === 0 || meritList.length === 0;
              const isMaxReached = currentListNum >= 3;

              if (isMaxReached) {
                return (
                  <button
                    onClick={resetMeritLists}
                    disabled={resetting || !selectedProgram}
                    className="inline-flex items-center px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Resetting Merit Lists...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Refresh &amp; Reset Merit Lists
                      </>
                    )}
                  </button>
                );
              } else if (isFirstGen) {
                return (
                  <button
                    onClick={generateMeritList}
                    disabled={generating || !selectedProgram}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Generating 1st Merit List...
                      </>
                    ) : (
                      <>
                        <Award className="h-5 w-5 mr-2" />
                        Generate 1st Merit List
                      </>
                    )}
                  </button>
                );
              } else {
                const nextListNum = currentListNum + 1;
                const nextListOrdinal = getOrdinal(nextListNum);
                return (
                  <button
                    onClick={generateNextMeritList}
                    disabled={generatingNext || !selectedProgram}
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {generatingNext ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Generating {nextListOrdinal} Merit List...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Generate {nextListOrdinal} Merit List (Auto-Drop Unpaid)
                      </>
                    )}
                  </button>
                );
              }
            })()}
          </div>
        )}
      </div>

      {/* Admin Fee & Deadline Configuration Box */}
      {admin && showFeeConfig && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-primary-500/30 p-6 space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <DollarSign className="h-5 w-5 text-green-400 mr-2" />
            Program Fee Structure & Payment Deadline
          </h3>
          <form onSubmit={handleSaveFeeConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Admission Fee (PKR)</label>
              <input
                type="number"
                value={feeForm.admission_fee}
                onChange={e => setFeeForm({ ...feeForm, admission_fee: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tuition Fee (PKR)</label>
              <input
                type="number"
                value={feeForm.tuition_fee}
                onChange={e => setFeeForm({ ...feeForm, tuition_fee: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fee Payment Deadline</label>
              <input
                type="date"
                value={feeForm.fee_deadline}
                onChange={e => setFeeForm({ ...feeForm, fee_deadline: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bank Name</label>
              <input
                type="text"
                value={feeForm.bank_name}
                onChange={e => setFeeForm({ ...feeForm, bank_name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Account Number</label>
              <input
                type="text"
                value={feeForm.account_number}
                onChange={e => setFeeForm({ ...feeForm, account_number: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Account Title</label>
              <input
                type="text"
                value={feeForm.account_title}
                onChange={e => setFeeForm({ ...feeForm, account_title: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">Select Program</label>
            <select
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 dark:text-white"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              {programs.map((program) => {
                const val = program._id || program.id || program.name;
                return <option key={val} value={val}>{program.name}</option>;
              })}
            </select>
          </div>
          {admin && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">Category Filter</label>
              <select
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 dark:text-white"
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
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-6 border border-primary-500/20 dark:border-primary-800 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProgramData.name}</h3>
              <p className="text-gray-500 dark:text-gray-400">{selectedProgramData.department}</p>
            </div>
            {programDetails?.fee_deadline && (
              <div className="text-right text-xs">
                <span className="text-gray-500 dark:text-gray-400">Payment Deadline:</span>
                <p className="text-yellow-400 font-bold">
                  {new Date(programDetails.fee_deadline).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProgramData.total_seats}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Seats</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-2xl font-bold text-green-400">{stats.confirmed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Confirmed (Paid)</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.selected}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Selected (Pending Fee)</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-2xl font-bold text-yellow-400">{stats.waitlisted}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Waitlisted</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-2xl font-bold text-red-400">{stats.dropped}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dropped (Unpaid)</p>
            </div>
          </div>
        </div>
      )}

      {/* Merit List Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {loading ? (
          <SkeletonLoader variant="table" theme="dark" />
        ) : meritList.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="h-16 w-16 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Merit List Available</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {admin
                ? "Generate a merit list to see the rankings"
                : "Merit list has not been published yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admission Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fee Payment</th>
                  {admin && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {meritList.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${entry.rank <= 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mr-3 border border-primary-500/20">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                            {entry.student?.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{entry.student?.full_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{entry.student?.cnic}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${entry.category === 'merit' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          entry.category === 'quota' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300' :
                            'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}>
                        {getCategoryIcon(entry.category)}
                        <span className="ml-2 capitalize">{entry.category.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-1 w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mr-3">
                          <div
                            className="h-full bg-primary-600 rounded-full"
                            style={{ width: `${entry.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.score.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${entry.status === 'confirmed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-500/30'
                          : entry.status === 'selected'
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                            : entry.status === 'dropped'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                        {entry.status === 'confirmed' ? (
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        ) : entry.status === 'selected' ? (
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        ) : entry.status === 'dropped' ? (
                          <X className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        )}
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </td>

                    {/* Fee Payment Column */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${entry.fee_status === 'verified' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          entry.fee_status === 'submitted' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                            entry.fee_status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                        {entry.fee_status === 'verified' ? 'Paid & Verified' :
                          entry.fee_status === 'submitted' ? 'Receipt Uploaded' :
                            entry.fee_status === 'rejected' ? 'Receipt Rejected' :
                              'Unpaid'}
                      </span>
                    </td>

                    {/* Admin Actions */}
                    {admin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {entry.fee_receipt_url && (
                            <a
                              href={entry.fee_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-primary-600 dark:text-primary-400 rounded transition-colors"
                              title="View Paid Receipt"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          {entry.fee_status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleVerifyFee(entry.id, 'verify')}
                                className="p-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded transition-colors"
                                title="Approve & Confirm Admission"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleVerifyFee(entry.id, 'reject')}
                                className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors"
                                title="Reject Receipt"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Previous Merit Lists Modal */}
      {showPreviousListsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <History className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-2" />
                Generated Merit Lists
              </h3>
              <button
                onClick={() => setShowPreviousListsModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {programDetails?.current_merit_list > 0 ? (
                Array.from({ length: programDetails.current_merit_list }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mr-3 border border-primary-500/20">
                        <Award className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">Merit List #{i + 1}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedProgramData?.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => exportToCSV(i + 1)}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                      title="Export CSV"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  No merit lists have been generated yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeritList;
