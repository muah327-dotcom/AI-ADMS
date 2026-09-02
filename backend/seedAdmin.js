import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/admission_system');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@university.edu' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email: admin@university.edu');
      console.log('Password: admin123');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await User.create({
      email: 'admin@university.edu',
      password: hashedPassword,
      full_name: 'System Administrator',
      role: 'admin',
      cnic: '00000-0000000-0',
      phone: '+92-300-0000000',
      address: 'University Campus',
      is_active: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📧 Email: admin@university.edu');
    console.log('🔑 Password: admin123');
    console.log('');
    console.log('You can now login with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdminUser();
