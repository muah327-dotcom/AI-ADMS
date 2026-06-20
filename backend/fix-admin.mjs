import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const password = 'admin123';
    const hashedPassword = bcrypt.hashSync(password, 10);

    console.log('Generated hash:', hashedPassword);

    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'admin@pucit.edu.pk' },
      { $set: { password_hash: hashedPassword } }
    );

    if (result.modifiedCount > 0) {
      console.log('Admin password updated successfully!');
    } else {
      console.log('No admin user found with email admin@pucit.edu.pk');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixAdminPassword();
