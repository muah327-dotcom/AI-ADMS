import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Only main admin (role === 'admin'), not department_admin
export const requireMainAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Main admin access required' });
  }
  next();
};

// Both main admin and department admin
export const requireAnyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!['admin', 'department_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get department filter for department admins
// Returns null for main admins (no filter needed) or { department: 'name' } for department admins
export const getDepartmentFilter = (req) => {
  if (req.user.role === 'department_admin' && req.user.department) {
    return { department: req.user.department };
  }
  return null;
};

// Check if user is main admin
export const isMainAdmin = (req) => {
  return req.user?.role === 'admin';
};

// Check if user is department admin
export const isDepartmentAdmin = (req) => {
  return req.user?.role === 'department_admin';
};
