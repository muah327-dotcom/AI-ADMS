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
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const ManagePrograms = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
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

  useEffect(() => {
    fetchPrograms();
  }, []);

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
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingProgram ? `/api/admin/programs/${editingProgram.id}` : '/api/admin/programs';
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
        setShowModal(false);
        setEditingProgram(null);
        resetForm();
        fetchPrograms();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save program');
      }
    } catch (error) {
      console.error('Save program error:', error);
      toast.error('Error saving program');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (program) => {
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
    setShowModal(true);
  };

  const handleDelete = async (id) => {
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
      console.error('Delete error:', error);
      toast.error('Error deleting program');
    }
  };

  const resetForm = () => {
    setFormData({
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
  };

  const filteredPrograms = programs.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Manage Programs</h1>
          <p className="text-gray-400 mt-1">Create and manage academic programs</p>
        </div>
        <button
          onClick={() => { setEditingProgram(null); resetForm(); setShowModal(true); }}
          className="inline-flex items-center px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Program
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search programs..."
            className="w-full pl-10 pr-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms.map((program) => (
          <div key={program.id} className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <GraduationCap className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(program)}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(program.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white">{program.name}</h3>
              <p className="text-gray-400 text-sm">{program.department}</p>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-2 bg-[#0f0f0f] rounded border border-gray-800">
                  <p className="text-lg font-semibold text-white">{program.total_seats}</p>
                  <p className="text-xs text-gray-500">Seats</p>
                </div>
                <div className="text-center p-2 bg-[#0f0f0f] rounded border border-gray-800">
                  <p className="text-lg font-semibold text-cyan-400">{program.min_percentage}%</p>
                  <p className="text-xs text-gray-500">Min %</p>
                </div>
                <div className="text-center p-2 bg-[#0f0f0f] rounded border border-gray-800">
                  <p className="text-lg font-semibold text-white">{program.duration_years || '-'}</p>
                  <p className="text-xs text-gray-500">Years</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1">Required Subjects:</p>
                <div className="flex flex-wrap gap-1">
                  {program.required_subjects?.map((subject, idx) => (
                    <span key={idx} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded border border-cyan-500/20">
                      {subject}
                    </span>
                  )) || <span className="text-xs text-gray-500">None specified</span>}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-800">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  program.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
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
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
          <div className="bg-[#1a1a1a] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-gray-800">
            <div className="p-6 border-b border-gray-800 sticky top-0 bg-[#1a1a1a]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {editingProgram ? 'Edit Program' : 'Add New Program'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Program Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Department *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white h-20 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Seats *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                    value={formData.total_seats}
                    onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Min Percentage Required *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                    value={formData.min_percentage}
                    onChange={(e) => setFormData({ ...formData, min_percentage: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Merit Seats</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                    value={formData.merit_seats}
                    onChange={(e) => setFormData({ ...formData, merit_seats: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quota Seats</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                    value={formData.quota_seats}
                    onChange={(e) => setFormData({ ...formData, quota_seats: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Self Finance Seats</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                    value={formData.self_finance_seats}
                    onChange={(e) => setFormData({ ...formData, self_finance_seats: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
                    value={formData.duration_years}
                    onChange={(e) => setFormData({ ...formData, duration_years: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Required Subjects (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-white"
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
                      className="h-4 w-4 text-cyan-500 rounded border-gray-700 bg-[#0f0f0f]"
                    />
                    <span className="text-sm text-gray-300">Active Program</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 font-medium"
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
