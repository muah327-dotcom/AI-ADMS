import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { initGridFS } from './utils/gridfs.js';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import adminRoutes from './routes/admin.js';
import meritRoutes from './routes/merit.js';
import analyticsRoutes from './routes/analytics.js';
import ocrRoutes from './routes/ocr.js';
import recommendationRoutes from './routes/recommendations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Connect to MongoDB safely for serverless environments
connectDB().catch(err => console.error('Initial MongoDB connection error:', err.message));

// Initialize GridFS after connection
mongoose.connection.once('open', () => {
  try {
    initGridFS();
  } catch (err) {
    console.error('GridFS init error:', err.message);
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration — allow Vercel frontend and local dev
const allowedOrigins = [
  'https://projectabc-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed) || origin === allowed)) {
      return callback(null, true);
    }
    // Also allow any *.vercel.app subdomain for preview deployments
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // fallback: allow all for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token']
}));

// Explicitly handle preflight OPTIONS for all routes
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure database connection is ready before processing API requests
app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (dbErr) {
    console.error('DB Connection middleware error:', dbErr);
    res.status(500).json({ error: 'Database connection error', details: dbErr.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/merit', meritRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/recommendations', recommendationRoutes);

app.get('/api/health', (req, res) => {
  const dbState = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }[mongoose.connection.readyState] || 'unknown';

  res.json({ 
    status: 'OK', 
    message: 'AI Admission System API is running',
    database: dbState,
    env: {
      has_mongodb_uri: !!process.env.MONGODB_URI,
      has_jwt_secret: !!process.env.JWT_SECRET
    }
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
