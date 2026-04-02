import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import StudentDashboard from './components/Dashboard/StudentDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import Applications from './components/Applications/Applications';
import NewApplication from './components/Applications/NewApplication';
import ApplicationTracking from './components/Applications/ApplicationTracking';
import ProgramRecommendations from './components/Recommendations/ProgramRecommendations';
import DocumentUpload from './components/Documents/DocumentUpload';
import MeritList from './components/MeritList/MeritList';
import AdminAnalytics from './components/Admin/AdminAnalytics';
import ManagePrograms from './components/Admin/ManagePrograms';
import AllApplications from './components/Admin/AllApplications';
import StudentManagement from './components/Admin/StudentManagement';

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
    <Routes>
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
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/new" element={<NewApplication />} />
        <Route path="applications/track/:id" element={<ApplicationTracking />} />
        <Route path="recommendations" element={<ProgramRecommendations />} />
        <Route path="documents" element={<DocumentUpload />} />
        <Route path="merit-list" element={<MeritList />} />
      </Route>

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
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
