import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { initGridFS } from './utils/gridfs.js';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import adminRoutes from './routes/admin.js';
import meritRoutes from './routes/merit.js';
import analyticsRoutes from './routes/analytics.js';
import ocrRoutes from './routes/ocr.js';
import recommendationRoutes from './routes/recommendations.js';

dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize GridFS after connection
mongoose.connection.once('open', () => {
  initGridFS();
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/merit', meritRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/recommendations', recommendationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Admission System API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
