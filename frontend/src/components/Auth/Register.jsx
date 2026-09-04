import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { GraduationCap, Eye, EyeOff, Loader2, User, Mail, Phone, MapPin, CreditCard, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    cnic: '',
    phone: '',
    address: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const formatPakistaniPhone = (value) => {
    if (!value) return '';
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length >= 12) {
      digits = '0' + digits.slice(2);
    }
    digits = digits.slice(0, 11);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  };

  const formatPakistaniCnic = (value) => {
    if (!value) return '';
    let digits = value.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'full_name') {
      processedValue = value.replace(/[^A-Za-z\s.\-']/g, '');
    } else if (name === 'phone') {
      processedValue = formatPakistaniPhone(value);
    } else if (name === 'cnic') {
      processedValue = formatPakistaniCnic(value);
    }
    setFormData({ ...formData, [name]: processedValue });
  };

  const validateForm = () => {
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      toast.error('Please enter your full name in English');
      return false;
    }
    if (!/^[A-Za-z\s.\-']+$/.test(formData.full_name.trim())) {
      toast.error('Full Name must only contain English letters');
      return false;
    }
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    const cnicPattern = /^\d{5}-\d{7}-\d$/;
    if (!cnicPattern.test(formData.cnic)) {
      toast.error('CNIC must be in format: 12345-1234567-1');
      return false;
    }
    if (formData.phone && formData.phone.trim() !== '') {
      const isPakPhone = /^03[0-9]{2}-[0-9]{7}$/.test(formData.phone.trim()) || /^03[0-9]{9}$/.test(formData.phone.trim());
      if (!isPakPhone) {
        toast.error('Phone number must be a valid Pakistani mobile number (format: 03XX-XXXXXXX)');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { confirm_password, ...registerData } = formData;
      const result = await register({ ...registerData, role: 'student' });

      if (result.success) {
        toast.success('Registration successful! Welcome aboard.');
        navigate(result.user.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      toast.error('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12 relative">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="max-w-lg w-full space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 animate-scale-in">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Student Registration
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create your student account to apply for programs
          </p>
          <div className="mt-3 inline-flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
            Students Only - Admin access is pre-configured
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="full_name" className="form-label flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="form-input"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="email" className="form-label flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input pr-10"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="form-label">Confirm Password</label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                className="form-input"
                placeholder="Confirm password"
                value={formData.confirm_password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="cnic" className="form-label flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                CNIC
              </label>
              <input
                id="cnic"
                name="cnic"
                type="text"
                required
                maxLength={15}
                className="form-input"
                placeholder="12345-1234567-1"
                value={formData.cnic}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="form-label flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                maxLength={12}
                className="form-input"
                placeholder="03XX-XXXXXXX"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="form-label flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                className="form-input"
                placeholder="Enter your address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center dark:focus:ring-offset-gray-800"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
