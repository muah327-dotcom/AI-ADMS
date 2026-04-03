import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Award,
  FileText,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  Crown,
  Star,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [categoryFilter, page]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('page', page);
      params.append('limit', 20);

      const response = await fetch(`/api/admin/students?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch students error:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'merit':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'quota':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'self_finance':
        return <GraduationCap className="h-4 w-4 text-green-500" />;
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

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.cnic?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Student Management</h1>
          <p className="text-gray-400 mt-1">View and manage enrolled students</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{students.length}</p>
          <p className="text-sm text-gray-400">Total Students</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Crown className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {students.filter(s => s.admission_category === 'merit').length}
          </p>
          <p className="text-sm text-gray-400">Merit Category</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Star className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {students.filter(s => s.admission_category === 'quota').length}
          </p>
          <p className="text-sm text-gray-400">Quota Category</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <GraduationCap className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {students.filter(s => s.admission_category === 'self_finance').length}
          </p>
          <p className="text-sm text-gray-400">Self Finance</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search students by name, email or CNIC..."
              className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              className="px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="merit">Merit</option>
              <option value="quota">Quota</option>
              <option value="self_finance">Self Finance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No students found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedStudent(student); setShowModal(true); }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center mr-3 border border-cyan-500/20">
                          <span className="text-cyan-400 font-semibold">
                            {student.full_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{student.full_name}</p>
                          <p className="text-sm text-gray-400">{student.email}</p>
                          <p className="text-xs text-gray-500">{student.cnic}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.admission_category ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          student.admission_category === 'merit' ? 'bg-yellow-500/20 text-yellow-400' :
                          student.admission_category === 'quota' ? 'bg-cyan-500/20 text-cyan-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {getCategoryIcon(student.admission_category)}
                          <span className="ml-2 capitalize">{student.admission_category.replace('_', ' ')}</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Not categorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {student.applications?.slice(0, 2).map((app, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              app.status === 'approved' ? 'bg-green-500' :
                              app.status === 'rejected' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`} />
                            <span className="text-sm text-gray-400">{app.program?.name}</span>
                          </div>
                        ))}
                        {student.applications?.length > 2 && (
                          <p className="text-xs text-gray-500">+{student.applications.length - 2} more</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredStudents.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {filteredStudents.length} students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
          <div className="bg-[#1a1a1a] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-800">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Student Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <span className="text-3xl text-cyan-400 font-bold">
                    {selectedStudent.full_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedStudent.full_name}</h3>
                  <p className="text-gray-400">{selectedStudent.email}</p>
                  {selectedStudent.admission_category && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                      selectedStudent.admission_category === 'merit' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedStudent.admission_category === 'quota' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {getCategoryIcon(selectedStudent.admission_category)}
                      <span className="ml-2 capitalize">{selectedStudent.admission_category.replace('_', ' ')}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-500">CNIC</p>
                  <p className="font-medium text-white">{selectedStudent.cnic || 'N/A'}</p>
                </div>
                <div className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-white">{selectedStudent.phone || 'N/A'}</p>
                </div>
                <div className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-800 col-span-2">
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="font-medium text-white">{selectedStudent.address || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-white mb-3">Applications</h4>
                <div className="space-y-2">
                  {selectedStudent.applications?.map((app, idx) => (
                    <div key={idx} className="p-3 bg-[#0f0f0f] rounded-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{app.program?.name}</p>
                          <p className="text-xs text-gray-400">{app.program?.department}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      {app.admission_category && (
                        <p className="text-xs text-gray-500 mt-1">
                          Category: <span className="capitalize">{app.admission_category.replace('_', ' ')}</span>
                        </p>
                      )}
                    </div>
                  )) || <p className="text-gray-500">No applications</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
