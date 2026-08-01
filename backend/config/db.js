import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const DEFAULT_MONGODB_URI = 'mongodb+srv://muah327_db_user:abc%40gmail@cluster0.rzzuhei.mongodb.net/admission_system?retryWrites=true&w=majority';
  let uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
  
  let conn;
  try {
    console.log('Attempting to connect to Cloud MongoDB...');
    conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Cloud MongoDB connection failed (${error.message}).`);
    
    if (process.env.VERCEL) {
      console.error('Cannot run in-memory MongoDB on Vercel serverless environment. Throwing connection error.');
      throw error;
    }
    
    console.log('Starting in-memory MongoDB server as fallback...');
    
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoMS = await MongoMemoryServer.create({
        binary: {
          version: '6.0.16'
        }
      });
      const inMemoryUri = mongoMS.getUri();
      console.log(`In-memory MongoDB started at: ${inMemoryUri}`);
      
      conn = await mongoose.connect(inMemoryUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`Connected to in-memory MongoDB: ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`Failed to start in-memory MongoDB: ${fallbackError.message}`);
      process.exit(1);
    }
  }

  // Auto-seed admin user and default programs if they don't exist
  try {
    const User = (await import('../models/User.js')).default;
    const Program = (await import('../models/Program.js')).default;

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('Seeding default Admin user...');
      const bcrypt = (await import('bcryptjs')).default;
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        email: 'admin@pucit.edu.pk',
        password: hashedPassword,
        full_name: 'System Administrator',
        role: 'admin',
        cnic: '00000-0000000-0',
        phone: '+92-300-0000000',
        address: 'University Campus',
        is_active: true
      });
      console.log('✅ Admin user created: admin@pucit.edu.pk / admin123');
    }

    const programCount = await Program.countDocuments();
    if (programCount === 0) {
      console.log('Seeding default Programs...');
      await Program.insertMany([
        { name: 'BS Computer Science', description: 'Bachelor of Science in Computer Science', department: 'Computer Science', duration_years: 4, total_seats: 120, min_percentage: 60, required_subjects: ['Mathematics', 'Physics'], is_active: true },
        { name: 'BE Electrical Engineering', description: 'Bachelor of Engineering in Electrical Engineering', department: 'Engineering', duration_years: 4, total_seats: 60, min_percentage: 65, required_subjects: ['Mathematics', 'Physics'], is_active: true },
        { name: 'BBA', description: 'Bachelor of Business Administration', department: 'Business', duration_years: 4, total_seats: 150, min_percentage: 50, required_subjects: ['Mathematics'], is_active: true },
      ]);
      console.log('✅ Default programs seeded!');
    }
  } catch (seedError) {
    console.error(`Seeding warning: ${seedError.message}`);
  }

  return conn;
};

export default connectDB;
