import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';

// Lazy-loaded route components — each becomes its own bundle chunk
const LandingPage = lazy(() => import('./components/Landing/LandingPage'));
const Login = lazy(() => import('./components/Auth/Login'));
const Register = lazy(() => import('./components/Auth/Register'));
const StudentDashboard = lazy(() => import('./components/Dashboard/StudentDashboard'));
const AdminDashboard = lazy(() => import('./components/Dashboard/AdminDashboard'));
const Applications = lazy(() => import('./components/Applications/Applications'));
const NewApplication = lazy(() => import('./components/Applications/NewApplication'));
const ApplicationTracking = lazy(() => import('./components/Applications/ApplicationTracking'));
const ProgramRecommendations = lazy(() => import('./components/Recommendations/ProgramRecommendations'));
const DocumentUpload = lazy(() => import('./components/Documents/DocumentUpload'));
const MeritList = lazy(() => import('./components/MeritList/MeritList'));
const FeeChallan = lazy(() => import('./components/Fee/FeeChallan'));
const AdminAnalytics = lazy(() => import('./components/Admin/AdminAnalytics'));
const ManagePrograms = lazy(() => import('./components/Admin/ManagePrograms'));
const AllApplications = lazy(() => import('./components/Admin/AllApplications'));
const StudentManagement = lazy(() => import('./components/Admin/StudentManagement'));
const Settings = lazy(() => import('./components/Settings/Settings'));
const PrivacyPolicy = lazy(() => import('./components/Legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/Legal/TermsOfService'));
const ContactPage = lazy(() => import('./components/Legal/ContactPage'));

// Shared loading fallback for lazy routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Legal Pages */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/contact" element={<ContactPage />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        
        {/* Student Dashboard Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<StudentDashboard />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/new" element={<NewApplication />} />
          <Route path="applications/track/:id" element={<ApplicationTracking />} />
          <Route path="recommendations" element={<ProgramRecommendations />} />
          <Route path="documents" element={<DocumentUpload />} />
          <Route path="merit-list" element={<MeritList />} />
          <Route path="fee-challan" element={<FeeChallan />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="programs" element={<ManagePrograms />} />
          <Route path="applications" element={<AllApplications />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="merit-list" element={<MeritList admin />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
