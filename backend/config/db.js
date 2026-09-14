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

  // There is no default connection string. A hardcoded fallback URI used to live here,
  // which meant any checkout — and anyone reading the public repo — shared one database.
  // The app now refuses to start without an explicit MONGODB_URI.
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Create backend/.env with your own MongoDB connection string ' +
      '(see backend/.env.example). The application will not start without it.'
    );
  }

  let conn;
  try {
    console.log('Connecting to MongoDB...');
    conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    // The previous fallback here tried to start mongodb-memory-server, which is not in
    // backend/package.json, so it could only ever throw a confusing module-not-found
    // error on top of the real connection failure. Fail on the actual cause instead.
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }

  // Auto-seed admin user and default programs if they don't exist
  try {
    const User = (await import('../models/User.js')).default;
    const Program = (await import('../models/Program.js')).default;

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('Seeding default Admin user...');
      const bcrypt = (await import('bcryptjs')).default;
      // A published deployment seeded with a known password is an open admin account.
      // Set ADMIN_PASSWORD in the environment for anything that is not local dev.
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (!process.env.ADMIN_PASSWORD) {
        console.warn('WARNING: seeding admin with the default password "admin123". ' +
          'Set ADMIN_PASSWORD before deploying anywhere reachable.');
      }
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        email: process.env.ADMIN_EMAIL || 'admin@university.edu',
        password: hashedPassword,
        full_name: 'System Administrator',
        role: 'admin',
        cnic: '00000-0000000-0',
        phone: '+92-300-0000000',
        address: 'University Campus',
        is_active: true
      });
      console.log(`Admin user created: ${process.env.ADMIN_EMAIL || 'admin@university.edu'}`);
    }
  } catch (seedError) {
    console.error(`Seeding warning: ${seedError.message}`);
  }

  return conn;
};

export default connectDB;
