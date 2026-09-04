import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  GraduationCap,
  Users,
  BookOpen,
  Save,
  X,

  ArrowLeft,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from '../Common/SkeletonLoader';

const ManagePrograms = () => {
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
    total_seats: '',
    merit_seats: '',
    quota_seats: '',
    self_finance_seats: '',
    min_percentage: '',
    required_subjects: '',
    duration_years: '',
    is_active: true
  });

  const [deptFormData, setDeptFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const [programsRes, deptsRes] = await Promise.all([
        fetch('/api/applications/programs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/departments', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (programsRes.ok) {
        const data = await programsRes.json();
        setPrograms(data.programs || []);
      }
      
      if (deptsRes.ok) {
        const data = await deptsRes.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Fetch depts error:', error);
    }
  };

  const fetchPrograms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/applications/programs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Fetch programs error:', error);
    }
  };

  // --- Department Handlers ---
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingDept ? `/api/admin/departments/${editingDept._id}` : '/api/admin/departments';
      const method = editingDept ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deptFormData)
      });

      if (response.ok) {
        toast.success(editingDept ? 'Department updated successfully' : 'Department created successfully');
        setShowDeptModal(false);
        setEditingDept(null);
        resetDeptForm();
        fetchDepartments();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save department');
      }
    } catch (error) {
      toast.error('Error saving department');
    } finally {
      setSaving(false);
    }
  };

  const handleEditDept = (dept) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name,
      description: dept.description || '',
      is_active: dept.is_active
    });
    setShowDeptModal(true);
  };

  const handleDeleteDept = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Department deleted successfully');
        fetchDepartments();
      } else {
        toast.error('Failed to delete department');
      }
    } catch (error) {
      toast.error('Error deleting department');
    }
  };

  const resetDeptForm = () => {
    setDeptFormData({ name: '', description: '', is_active: true });
  };

  // --- Program Handlers ---
  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingProgram ? `/api/admin/programs/${editingProgram._id}` : '/api/admin/programs';
      const method = editingProgram ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        total_seats: parseInt(formData.total_seats),
        merit_seats: parseInt(formData.merit_seats),
        quota_seats: parseInt(formData.quota_seats),
        self_finance_seats: parseInt(formData.self_finance_seats),
        min_percentage: parseFloat(formData.min_percentage),
        duration_years: parseInt(formData.duration_years),
        required_subjects: formData.required_subjects.split(',').map(s => s.trim()).filter(Boolean)
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingProgram ? 'Program updated successfully' : 'Program created successfully');
        setShowProgramModal(false);
        setEditingProgram(null);
        resetProgramForm();
        fetchPrograms();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save program');
      }
    } catch (error) {
      toast.error('Error saving program');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      department: program.department,
      description: program.description || '',
      total_seats: program.total_seats,
      merit_seats: program.merit_seats,
      quota_seats: program.quota_seats,
      self_finance_seats: program.self_finance_seats,
      min_percentage: program.min_percentage,
      required_subjects: program.required_subjects?.join(', ') || '',
      duration_years: program.duration_years || '',
      is_active: program.is_active
    });
    setShowProgramModal(true);
  };

  const handleDeleteProgram = async (id) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/programs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Program deleted successfully');
        fetchPrograms();
      } else {
        toast.error('Failed to delete program');
      }
    } catch (error) {
      toast.error('Error deleting program');
    }
  };

  const resetProgramForm = () => {
    setFormData({
      name: '',
      department: selectedDepartment ? selectedDepartment.name : '',
      description: '',
      total_seats: '',
      merit_seats: '',
      quota_seats: '',
      self_finance_seats: '',
      min_percentage: '',
      required_subjects: '',
      duration_years: '',
      is_active: true
    });
  };

  const filteredItems = selectedDepartment
    ? programs.filter(p => p.department === selectedDepartment.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return <SkeletonLoader variant="table" theme="dark" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {selectedDepartment && (
              <button
                onClick={() => {
                  setSelectedDepartment(null);
                  setSearchTerm('');
                }}
                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                title="Back to Departments"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {selectedDepartment ? `${selectedDepartment.name} Programs` : 'Manage Departments & Programs'}
            </h1>
          </div>
          <p className="text-gray-500 mt-1">
            {selectedDepartment ? `Manage programs for the ${selectedDepartment.name} department` : 'Manage academic departments and their associated programs'}
          </p>
        </div>
        
        <button
          onClick={() => {
            if (selectedDepartment) {
              setEditingProgram(null);
              resetProgramForm();
              setShowProgramModal(true);
            } else {
              setEditingDept(null);
              resetDeptForm();
              setShowDeptModal(true);
            }
          }}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-gray-900 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          {selectedDepartment ? 'Add Program' : 'Add Department'}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder={selectedDepartment ? "Search programs..." : "Search departments..."}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid View */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {!selectedDepartment ? (
          // Departments List
          filteredItems.map((dept) => {
            const deptProgramsCount = programs.filter(p => p.department === dept.name).length;
            
            return (
              <div key={dept._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-200 transition-colors flex flex-col h-full shadow-sm">
                <div className="p-6 flex-grow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                      <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditDept(dept)}
                        className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
                        title="Edit Department"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept._id)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete Department"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{dept.name}</h3>
                  {dept.description && (
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{dept.description}</p>
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      dept.is_active ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {deptProgramsCount} Program{deptProgramsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setSelectedDepartment(dept);
                    setSearchTerm('');
                  }}
                  className="w-full py-3 bg-gray-50 text-primary-600 hover:bg-primary-50 transition-colors border-t border-gray-200 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Manage Programs
                </button>
              </div>
            );
          })
        ) : (
          // Programs List
          filteredItems.map((program) => (
            <div key={program._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-200 transition-colors shadow-sm">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <GraduationCap className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditProgram(program)}
                      className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(program._id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                <p className="text-gray-500 text-sm">{program.department}</p>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
                    <p className="text-lg font-semibold text-gray-900">{program.total_seats}</p>
                    <p className="text-xs text-gray-500">Seats</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
                    <p className="text-lg font-semibold text-primary-600">{program.min_percentage}%</p>
                    <p className="text-xs text-gray-500">Min %</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
                    <p className="text-lg font-semibold text-gray-900">{program.duration_years || '-'}</p>
                    <p className="text-xs text-gray-500">Years</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-1">Required Subjects:</p>
                  <div className="flex flex-wrap gap-1">
                    {program.required_subjects?.map((subject, idx) => (
                      <span key={idx} className="px-2 py-1 bg-primary-50 text-primary-600 text-xs rounded border border-primary-200">
                        {subject}
                      </span>
                    )) || <span className="text-xs text-gray-500">None specified</span>}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    program.is_active ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {program.is_active ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {filteredItems.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center">
            <p className="text-gray-500 text-lg">No {selectedDepartment ? 'programs' : 'departments'} found.</p>
          </div>
        )}
      </div>

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-200">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingDept ? 'Edit Department' : 'Add New Department'}
                </h2>
                <button onClick={() => setShowDeptModal(false)} className="p-2 text-gray-500 hover:text-gray-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleDeptSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 h-24 resize-none"
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deptFormData.is_active}
                    onChange={(e) => setDeptFormData({ ...deptFormData, is_active: e.target.checked })}
                    className="h-4 w-4 text-cyan-500 rounded border-gray-200 bg-gray-50"
                  />
                  <span className="text-sm text-gray-700">Active Department</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowDeptModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-900 font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center px-4 py-2 bg-primary-600 text-gray-900 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium">
                  {saving ? <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />Saving...</> : <><Save className="h-5 w-5 mr-2" />{editingDept ? 'Update' : 'Create'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Program Modal (Unchanged Layout) */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-200">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingProgram ? 'Edit Program' : 'Add New Program'}
                </h2>
                <button onClick={() => setShowProgramModal(false)} className="p-2 text-gray-500 hover:text-gray-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleProgramSubmit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Program Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 h-20 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Seats *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    value={formData.total_seats}
                    onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Percentage Required *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    value={formData.min_percentage}
                    onChange={(e) => setFormData({ ...formData, min_percentage: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Merit Seats</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    value={formData.merit_seats}
                    onChange={(e) => setFormData({ ...formData, merit_seats: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quota Seats</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    value={formData.quota_seats}
                    onChange={(e) => setFormData({ ...formData, quota_seats: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Self Finance Seats</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    value={formData.self_finance_seats}
                    onChange={(e) => setFormData({ ...formData, self_finance_seats: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    value={formData.duration_years}
                    onChange={(e) => setFormData({ ...formData, duration_years: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Required Subjects (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900"
                    placeholder="e.g., Mathematics, Physics, Chemistry"
                    value={formData.required_subjects}
                    onChange={(e) => setFormData({ ...formData, required_subjects: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-primary-600 rounded border-gray-200 bg-white"
                    />
                    <span className="text-sm text-gray-700">Active Program</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="px-4 py-2 text-gray-500 hover:text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-primary-600 text-gray-900 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      {editingProgram ? 'Update Program' : 'Create Program'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePrograms;
