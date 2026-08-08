import connectDB from './config/db.js';
import User from './models/User.js';
import Application from './models/Application.js';

const clearStudents = async () => {
  try {
    console.log('🚀 Connecting to Database...');
    await connectDB();

    // 1. Delete all applications (they all belong to students)
    const deletedApps = await Application.deleteMany({});
    console.log(`🗑️  Deleted ${deletedApps.deletedCount} applications.`);

    // 2. Delete all student users (preserve admins)
    const deletedUsers = await User.deleteMany({ role: 'student' });
    console.log(`🗑️  Deleted ${deletedUsers.deletedCount} student accounts.`);

    console.log('\n✅ All student data cleared successfully!');
    console.log('   Admin accounts, programs, and other data are preserved.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

clearStudents();
