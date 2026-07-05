import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GraduationCap, Eye, EyeOff, Loader2, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
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
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
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
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { confirm_password, ...registerData } = formData;
      // Force role to be student - no admin registration allowed
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4 py-12">
      <div className="max-w-lg w-full space-y-8 bg-white rounded-2xl shadow-xl p-8 animate-scale-in">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Student Registration
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your student account to apply for programs
          </p>
          <div className="mt-3 inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
                className="form-input"
                placeholder="03xx-xxxxxxx"
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
            className="btn-primary w-full flex items-center justify-center"
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
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
