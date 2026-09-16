import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

// Both the address and the password come from the environment. They used to be the
// literal strings admin@university.edu and admin123, printed to the console on every
// run, which meant every deployment seeded from this script shared one publicly known
// admin account.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@university.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const createAdminUser = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env and fill it in.');
    process.exit(1);
  }

  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD is not set. Choose a password and set it in backend/.env:');
    console.error('');
    console.error('  ADMIN_EMAIL=you@yourdomain.com');
    console.error('  ADMIN_PASSWORD=<a password you choose>');
    console.error('');
    console.error('Refusing to seed an administrator with a default password.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
      console.log('Nothing to do. To change its password, use the password reset flow.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      full_name: 'System Administrator',
      role: 'admin',
      cnic: '00000-0000000-0',
      phone: '+92-300-0000000',
      address: 'University Campus',
      is_active: true
    });

    console.log('Admin user created successfully.');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log('Password: the value of ADMIN_PASSWORD in your environment.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdminUser();
