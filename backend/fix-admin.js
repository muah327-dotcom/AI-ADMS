const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

async function fixAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const password = 'admin123';
    const hashedPassword = bcrypt.hashSync(password, 10);

    console.log('Generated hash:', hashedPassword);

    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'admin@university.edu' },
      { $set: { password_hash: hashedPassword } }
    );

    if (result.modifiedCount > 0) {
      console.log('Admin password updated successfully!');
    } else {
      console.log('No admin user found with email admin@university.edu');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixAdminPassword();
