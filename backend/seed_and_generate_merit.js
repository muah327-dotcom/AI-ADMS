import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import Program from './models/Program.js';
import User from './models/User.js';
import Application from './models/Application.js';

const runSeeder = async () => {
  try {
    console.log('🚀 Connecting to Database...');
    await connectDB();

    // Clean old test data first
    console.log('🧹 Cleaning old test applications...');
    const testEmails = [
      'ali.raza@teststudent.com', 'sara.fatima@teststudent.com', 'usman.tariq@teststudent.com',
      'ayesha.zainab@teststudent.com', 'hamza.bilal@teststudent.com', 'maryam.naeem@teststudent.com',
      'bilal.farooq@teststudent.com', 'sana.shahid@teststudent.com', 'daniyal.khalid@teststudent.com',
      'hina.parveen@teststudent.com', 'zeeshan.ahmed@teststudent.com', 'nimra.shahzadi@teststudent.com',
      'waqas.chaudhry@teststudent.com', 'khadija.zubair@teststudent.com', 'mustafa.qureshi@teststudent.com',
      'zohaib.hassan@teststudent.com', 'rimsha.kanwal@teststudent.com', 'asadullah.baig@teststudent.com',
      'tehreem.akram@teststudent.com', 'ahsan.javed@teststudent.com', 'laiba.nisar@teststudent.com',
      'shahzaib.gill@teststudent.com', 'mahnoor.abbasi@teststudent.com', 'faisal.rasheed@teststudent.com',
      'amna.tanveer@teststudent.com'
    ];
    const oldUsers = await User.find({ email: { $in: testEmails } });
    const oldUserIds = oldUsers.map(u => u._id);
    if (oldUserIds.length > 0) {
      const deletedApps = await Application.deleteMany({ user_id: { $in: oldUserIds } });
      console.log(`  Removed ${deletedApps.deletedCount} old test applications.`);
    }

    // 1. Load existing programs (admin must add them manually)
    console.log('📚 Loading Programs from database...');
    const allPrograms = await Program.find({ is_active: true });
    if (allPrograms.length === 0) {
      console.log('⚠️ No programs found in the database. Please add programs via the Admin dashboard first.');
      process.exit(0);
    }
    const programMap = {};
    for (const p of allPrograms) {
      programMap[p.name] = p;
    }
    console.log(`✅ ${allPrograms.length} Programs found.`);

    // 2. Student dataset
    const hashedPassword = await bcrypt.hash('Student123!', 10);

    const testStudentsData = [
      { full_name: 'Ali Raza Khan', email: 'ali.raza@teststudent.com', cnic: '35202-1111111-1', phone: '+92-300-1111111', address: 'House #12, Model Town, Lahore', father_name: 'Raza Mahmood Khan', date_of_birth: '2003-05-14', gender: 'male', alternate_phone: '+92-321-1111111', father_phone: '+92-300-9999911', permanent_address: 'House #12, Model Town, Lahore', matric_board: 'BISE Lahore', matric_passing_year: 2020, matric_obtained_marks: 1050, matric_total_marks: 1100, inter_board: 'BISE Lahore', inter_passing_year: 2022, inter_obtained_marks: 1045, inter_total_marks: 1100, entry_test_marks: 96 },
      { full_name: 'Sara Fatima', email: 'sara.fatima@teststudent.com', cnic: '35202-2222222-2', phone: '+92-300-2222222', address: 'Flat 4A, Gulberg III, Lahore', father_name: 'Ahmed Hassan', date_of_birth: '2003-08-22', gender: 'female', alternate_phone: '+92-321-2222222', father_phone: '+92-300-9999922', permanent_address: 'Flat 4A, Gulberg III, Lahore', matric_board: 'BISE Rawalpindi', matric_passing_year: 2020, matric_obtained_marks: 1030, matric_total_marks: 1100, inter_board: 'BISE Rawalpindi', inter_passing_year: 2022, inter_obtained_marks: 1020, inter_total_marks: 1100, entry_test_marks: 91 },
      { full_name: 'Usman Tariq', email: 'usman.tariq@teststudent.com', cnic: '35202-3333333-3', phone: '+92-300-3333333', address: 'Plot 88, DHA, Lahore', father_name: 'Tariq Mehmood', date_of_birth: '2002-11-10', gender: 'male', alternate_phone: '+92-321-3333333', father_phone: '+92-300-9999933', permanent_address: 'Plot 88, DHA, Lahore', matric_board: 'Federal Board', matric_passing_year: 2020, matric_obtained_marks: 995, matric_total_marks: 1100, inter_board: 'Federal Board', inter_passing_year: 2022, inter_obtained_marks: 980, inter_total_marks: 1100, entry_test_marks: 88 },
      { full_name: 'Ayesha Zainab', email: 'ayesha.zainab@teststudent.com', cnic: '35202-4444444-4', phone: '+92-300-4444444', address: 'House #45, Bahria Town, Lahore', father_name: 'Zainab Hussain', date_of_birth: '2003-01-30', gender: 'female', alternate_phone: '+92-321-4444444', father_phone: '+92-300-9999944', permanent_address: 'House #45, Bahria Town, Lahore', matric_board: 'BISE Multan', matric_passing_year: 2020, matric_obtained_marks: 960, matric_total_marks: 1100, inter_board: 'BISE Multan', inter_passing_year: 2022, inter_obtained_marks: 945, inter_total_marks: 1100, entry_test_marks: 84 },
      { full_name: 'Hamza Bilal', email: 'hamza.bilal@teststudent.com', cnic: '35202-5555555-5', phone: '+92-300-5555555', address: 'Street #9, Johar Town, Lahore', father_name: 'Bilal Ashraf', date_of_birth: '2003-03-18', gender: 'male', alternate_phone: '+92-321-5555555', father_phone: '+92-300-9999955', permanent_address: 'Street #9, Johar Town, Lahore', matric_board: 'BISE Faisalabad', matric_passing_year: 2020, matric_obtained_marks: 920, matric_total_marks: 1100, inter_board: 'BISE Faisalabad', inter_passing_year: 2022, inter_obtained_marks: 910, inter_total_marks: 1100, entry_test_marks: 79 },
      { full_name: 'Maryam Naeem', email: 'maryam.naeem@teststudent.com', cnic: '35202-6666666-6', phone: '+92-300-6666666', address: 'House #77, Iqbal Town, Lahore', father_name: 'Muhammad Naeem', date_of_birth: '2003-07-04', gender: 'female', alternate_phone: '+92-321-6666666', father_phone: '+92-300-9999966', permanent_address: 'House #77, Iqbal Town, Lahore', matric_board: 'BISE Gujranwala', matric_passing_year: 2020, matric_obtained_marks: 890, matric_total_marks: 1100, inter_board: 'BISE Gujranwala', inter_passing_year: 2022, inter_obtained_marks: 875, inter_total_marks: 1100, entry_test_marks: 76 },
      { full_name: 'Bilal Farooq', email: 'bilal.farooq@teststudent.com', cnic: '35202-7777777-7', phone: '+92-300-7777777', address: 'Garden Town, Lahore', father_name: 'Farooq Ahmad', date_of_birth: '2002-12-25', gender: 'male', alternate_phone: '+92-321-7777777', father_phone: '+92-300-9999977', permanent_address: 'Garden Town, Lahore', matric_board: 'BISE Lahore', matric_passing_year: 2020, matric_obtained_marks: 840, matric_total_marks: 1100, inter_board: 'BISE Lahore', inter_passing_year: 2022, inter_obtained_marks: 830, inter_total_marks: 1100, entry_test_marks: 72 },
      { full_name: 'Sana Shahid', email: 'sana.shahid@teststudent.com', cnic: '35202-8888888-8', phone: '+92-300-8888888', address: 'House #15, Canal View, Lahore', father_name: 'Shahid Iqbal', date_of_birth: '2003-09-12', gender: 'female', alternate_phone: '+92-321-8888888', father_phone: '+92-300-9999988', permanent_address: 'House #15, Canal View, Lahore', matric_board: 'BISE Sargodha', matric_passing_year: 2020, matric_obtained_marks: 800, matric_total_marks: 1100, inter_board: 'BISE Sargodha', inter_passing_year: 2022, inter_obtained_marks: 785, inter_total_marks: 1100, entry_test_marks: 68 },
      { full_name: 'Daniyal Khalid', email: 'daniyal.khalid@teststudent.com', cnic: '35202-9999999-9', phone: '+92-300-9999999', address: 'Askari 10, Lahore', father_name: 'Khalid Anwar', date_of_birth: '2003-02-14', gender: 'male', alternate_phone: '+92-321-9999999', father_phone: '+92-300-9999999', permanent_address: 'Askari 10, Lahore', matric_board: 'Federal Board', matric_passing_year: 2020, matric_obtained_marks: 760, matric_total_marks: 1100, inter_board: 'Federal Board', inter_passing_year: 2022, inter_obtained_marks: 750, inter_total_marks: 1100, entry_test_marks: 64 },
      { full_name: 'Hina Parveen', email: 'hina.parveen@teststudent.com', cnic: '35202-1010101-0', phone: '+92-300-1010101', address: 'Wapda Town, Lahore', father_name: 'Parveen Malik', date_of_birth: '2003-10-08', gender: 'female', alternate_phone: '+92-321-1010101', father_phone: '+92-300-9999900', permanent_address: 'Wapda Town, Lahore', matric_board: 'BISE Sahiwal', matric_passing_year: 2020, matric_obtained_marks: 710, matric_total_marks: 1100, inter_board: 'BISE Sahiwal', inter_passing_year: 2022, inter_obtained_marks: 695, inter_total_marks: 1100, entry_test_marks: 60 },
      { full_name: 'Nimra Shahzadi', email: 'nimra.shahzadi@teststudent.com', cnic: '35202-0000002-2', phone: '+92-300-0000002', address: 'Phase 3, DHA, Lahore', father_name: 'Shahzad Chaudhry', date_of_birth: '2003-04-12', gender: 'female', alternate_phone: '+92-321-0000002', father_phone: '+92-300-9000002', permanent_address: 'Phase 3, DHA, Lahore', matric_board: 'Federal Board', matric_passing_year: 2020, matric_obtained_marks: 1045, matric_total_marks: 1100, inter_board: 'Federal Board', inter_passing_year: 2022, inter_obtained_marks: 1043, inter_total_marks: 1100, entry_test_marks: 93 },
      { full_name: 'Waqas Chaudhry', email: 'waqas.chaudhry@teststudent.com', cnic: '35202-0000003-3', phone: '+92-300-0000003', address: 'Executive Cottages, Rawalpindi', father_name: 'Chaudhry Akram', date_of_birth: '2002-12-05', gender: 'male', alternate_phone: '+92-321-0000003', father_phone: '+92-300-9000003', permanent_address: 'Executive Cottages, Rawalpindi', matric_board: 'BISE Rawalpindi', matric_passing_year: 2020, matric_obtained_marks: 1012, matric_total_marks: 1100, inter_board: 'BISE Rawalpindi', inter_passing_year: 2022, inter_obtained_marks: 1006, inter_total_marks: 1100, entry_test_marks: 89 },
      { full_name: 'Khadija Zubair', email: 'khadija.zubair@teststudent.com', cnic: '35202-0000004-4', phone: '+92-300-0000004', address: 'Satellite Town, Gujranwala', father_name: 'Zubair Mansoor', date_of_birth: '2003-07-19', gender: 'female', alternate_phone: '+92-321-0000004', father_phone: '+92-300-9000004', permanent_address: 'Satellite Town, Gujranwala', matric_board: 'BISE Gujranwala', matric_passing_year: 2020, matric_obtained_marks: 995, matric_total_marks: 1100, inter_board: 'BISE Gujranwala', inter_passing_year: 2022, inter_obtained_marks: 981, inter_total_marks: 1100, entry_test_marks: 86 },
      { full_name: 'Mustafa Qureshi', email: 'mustafa.qureshi@teststudent.com', cnic: '35202-0000005-5', phone: '+92-300-0000005', address: 'University Town, Peshawar', father_name: 'Tariq Qureshi', date_of_birth: '2003-02-28', gender: 'male', alternate_phone: '+92-321-0000005', father_phone: '+92-300-9000005', permanent_address: 'University Town, Peshawar', matric_board: 'BISE Peshawar', matric_passing_year: 2020, matric_obtained_marks: 968, matric_total_marks: 1100, inter_board: 'BISE Peshawar', inter_passing_year: 2022, inter_obtained_marks: 955, inter_total_marks: 1100, entry_test_marks: 83 },
      { full_name: 'Zohaib Hassan', email: 'zohaib.hassan@teststudent.com', cnic: '35202-0000006-6', phone: '+92-300-0000006', address: 'Civil Lines, Faisalabad', father_name: 'Hassan Raza', date_of_birth: '2003-09-09', gender: 'male', alternate_phone: '+92-321-0000006', father_phone: '+92-300-9000006', permanent_address: 'Civil Lines, Faisalabad', matric_board: 'BISE Faisalabad', matric_passing_year: 2020, matric_obtained_marks: 935, matric_total_marks: 1100, inter_board: 'BISE Faisalabad', inter_passing_year: 2022, inter_obtained_marks: 930, inter_total_marks: 1100, entry_test_marks: 80 },
      { full_name: 'Rimsha Kanwal', email: 'rimsha.kanwal@teststudent.com', cnic: '35202-0000007-7', phone: '+92-300-0000007', address: 'Officers Colony, Multan', father_name: 'Kanwal Saeed', date_of_birth: '2003-06-25', gender: 'female', alternate_phone: '+92-321-0000007', father_phone: '+92-300-9000007', permanent_address: 'Officers Colony, Multan', matric_board: 'BISE Multan', matric_passing_year: 2020, matric_obtained_marks: 918, matric_total_marks: 1100, inter_board: 'BISE Multan', inter_passing_year: 2022, inter_obtained_marks: 902, inter_total_marks: 1100, entry_test_marks: 77 },
      { full_name: 'Asadullah Baig', email: 'asadullah.baig@teststudent.com', cnic: '35202-0000008-8', phone: '+92-300-0000008', address: 'PECHS, Karachi', father_name: 'Mirza Baig', date_of_birth: '2003-03-31', gender: 'male', alternate_phone: '+92-321-0000008', father_phone: '+92-300-9000008', permanent_address: 'PECHS, Karachi', matric_board: 'BISE Karachi', matric_passing_year: 2020, matric_obtained_marks: 891, matric_total_marks: 1100, inter_board: 'BISE Karachi', inter_passing_year: 2022, inter_obtained_marks: 878, inter_total_marks: 1100, entry_test_marks: 74 },
      { full_name: 'Tehreem Akram', email: 'tehreem.akram@teststudent.com', cnic: '35202-0000009-9', phone: '+92-300-0000009', address: 'Cantt Area, Sahiwal', father_name: 'Akram Ullah', date_of_birth: '2003-11-14', gender: 'female', alternate_phone: '+92-321-0000009', father_phone: '+92-300-9000009', permanent_address: 'Cantt Area, Sahiwal', matric_board: 'BISE Sahiwal', matric_passing_year: 2020, matric_obtained_marks: 869, matric_total_marks: 1100, inter_board: 'BISE Sahiwal', inter_passing_year: 2022, inter_obtained_marks: 852, inter_total_marks: 1100, entry_test_marks: 71 },
      { full_name: 'Ahsan Javed', email: 'ahsan.javed@teststudent.com', cnic: '35202-0000010-0', phone: '+92-300-0000010', address: 'Township, Lahore', father_name: 'Javed Akhtar', date_of_birth: '2003-08-01', gender: 'male', alternate_phone: '+92-321-0000010', father_phone: '+92-300-9000010', permanent_address: 'Township, Lahore', matric_board: 'BISE Lahore', matric_passing_year: 2020, matric_obtained_marks: 841, matric_total_marks: 1100, inter_board: 'BISE Lahore', inter_passing_year: 2022, inter_obtained_marks: 825, inter_total_marks: 1100, entry_test_marks: 69 },
      { full_name: 'Laiba Nisar', email: 'laiba.nisar@teststudent.com', cnic: '35202-0000011-1', phone: '+92-300-0000011', address: 'Samanabad, Lahore', father_name: 'Nisar Ahmed', date_of_birth: '2003-05-20', gender: 'female', alternate_phone: '+92-321-0000011', father_phone: '+92-300-9000011', permanent_address: 'Samanabad, Lahore', matric_board: 'BISE Lahore', matric_passing_year: 2020, matric_obtained_marks: 814, matric_total_marks: 1100, inter_board: 'BISE Lahore', inter_passing_year: 2022, inter_obtained_marks: 801, inter_total_marks: 1100, entry_test_marks: 66 },
      { full_name: 'Shahzaib Gill', email: 'shahzaib.gill@teststudent.com', cnic: '35202-0000012-2', phone: '+92-300-0000012', address: 'Cavalry Ground, Lahore', father_name: 'Michael Gill', date_of_birth: '2003-12-01', gender: 'male', alternate_phone: '+92-321-0000012', father_phone: '+92-300-9000012', permanent_address: 'Cavalry Ground, Lahore', matric_board: 'Federal Board', matric_passing_year: 2020, matric_obtained_marks: 786, matric_total_marks: 1100, inter_board: 'Federal Board', inter_passing_year: 2022, inter_obtained_marks: 772, inter_total_marks: 1100, entry_test_marks: 63 },
      { full_name: 'Mahnoor Abbasi', email: 'mahnoor.abbasi@teststudent.com', cnic: '35202-0000013-3', phone: '+92-300-0000013', address: 'Sector F-7/2, Islamabad', father_name: 'Zafar Abbasi', date_of_birth: '2003-09-18', gender: 'female', alternate_phone: '+92-321-0000013', father_phone: '+92-300-9000013', permanent_address: 'Sector F-7/2, Islamabad', matric_board: 'Federal Board', matric_passing_year: 2020, matric_obtained_marks: 759, matric_total_marks: 1100, inter_board: 'Federal Board', inter_passing_year: 2022, inter_obtained_marks: 742, inter_total_marks: 1100, entry_test_marks: 59 },
      { full_name: 'Faisal Rasheed', email: 'faisal.rasheed@teststudent.com', cnic: '35202-0000014-4', phone: '+92-300-0000014', address: 'Shadman, Lahore', father_name: 'Rasheed Ahmed', date_of_birth: '2003-04-03', gender: 'male', alternate_phone: '+92-321-0000014', father_phone: '+92-300-9000014', permanent_address: 'Shadman, Lahore', matric_board: 'BISE Lahore', matric_passing_year: 2020, matric_obtained_marks: 726, matric_total_marks: 1100, inter_board: 'BISE Lahore', inter_passing_year: 2022, inter_obtained_marks: 713, inter_total_marks: 1100, entry_test_marks: 56 },
      { full_name: 'Amna Tanveer', email: 'amna.tanveer@teststudent.com', cnic: '35202-0000015-5', phone: '+92-300-0000015', address: 'Gulshan-e-Ravi, Lahore', father_name: 'Tanveer Hussain', date_of_birth: '2003-10-29', gender: 'female', alternate_phone: '+92-321-0000015', father_phone: '+92-300-9000015', permanent_address: 'Gulshan-e-Ravi, Lahore', matric_board: 'BISE Lahore', matric_passing_year: 2020, matric_obtained_marks: 704, matric_total_marks: 1100, inter_board: 'BISE Lahore', inter_passing_year: 2022, inter_obtained_marks: 682, inter_total_marks: 1100, entry_test_marks: 52 }
    ];

    console.log('👨‍🎓 Creating/Updating Student Accounts...');
    const studentUsers = [];
    for (const studentData of testStudentsData) {
      const { entry_test_marks, ...userData } = studentData;
      const user = await User.findOneAndUpdate(
        { email: userData.email },
        { ...userData, password: hashedPassword, role: 'student', is_active: true },
        { upsert: true, new: true }
      );
      studentUsers.push({ user, entry_test_marks });
    }
    console.log(`✅ ${studentUsers.length} Student profiles ready.`);

    // 2b. Find existing student "ABC" from database and include in merit list
    console.log('🔍 Looking up existing student "ABC" from database...');
    const abcUser = await User.findOne({ full_name: { $regex: /^ABC$/i } });
    if (abcUser) {
      console.log(`  ✅ Found student "ABC" (${abcUser.email}) — will include in merit list as SELECTED.`);

      // Give ABC strong academic data if not already present, so they rank high
      const abcUpdates = {};
      if (!abcUser.matric_obtained_marks) abcUpdates.matric_obtained_marks = 1040;
      if (!abcUser.matric_total_marks) abcUpdates.matric_total_marks = 1100;
      if (!abcUser.inter_obtained_marks) abcUpdates.inter_obtained_marks = 1035;
      if (!abcUser.inter_total_marks) abcUpdates.inter_total_marks = 1100;
      if (!abcUser.matric_board) abcUpdates.matric_board = 'BISE Lahore';
      if (!abcUser.inter_board) abcUpdates.inter_board = 'BISE Lahore';
      if (!abcUser.matric_passing_year) abcUpdates.matric_passing_year = 2020;
      if (!abcUser.inter_passing_year) abcUpdates.inter_passing_year = 2022;
      if (!abcUser.cnic) abcUpdates.cnic = '35202-9876543-1';
      if (!abcUser.phone) abcUpdates.phone = '+92-300-9876543';
      if (!abcUser.address) abcUpdates.address = 'Test Address, Lahore';
      if (!abcUser.father_name) abcUpdates.father_name = 'Father of ABC';

      if (Object.keys(abcUpdates).length > 0) {
        await User.findByIdAndUpdate(abcUser._id, abcUpdates);
        Object.assign(abcUser, abcUpdates);
        console.log('  📝 Updated ABC with academic data for merit scoring.');
      }

      // Add ABC to the email lookup with high entry test marks (94) so they rank near the top
      studentUsers.push({ user: abcUser, entry_test_marks: 94 });
    } else {
      console.log('  ⚠️ Student "ABC" not found in database. Skipping. (Create a student named "ABC" first)');
    }

    // 3. REALISTIC program-specific applications
    //    Each student applies to only 1-3 programs (not all of them)
    //    This mirrors real life where students pick their preferred programs
    const programApplications = {
      'BS Computer Science': [
        'ali.raza@teststudent.com',         // Top scorer
        'nimra.shahzadi@teststudent.com',    // High scorer
        'usman.tariq@teststudent.com',       // Good scorer
        'khadija.zubair@teststudent.com',    // Good scorer
        'mustafa.qureshi@teststudent.com',   // Mid scorer
        'hamza.bilal@teststudent.com',       // Mid scorer
        'zohaib.hassan@teststudent.com',     // Mid scorer
        'maryam.naeem@teststudent.com',      // Lower-mid scorer
        'bilal.farooq@teststudent.com',      // Lower scorer
        'ahsan.javed@teststudent.com',       // Lower scorer
        'laiba.nisar@teststudent.com',       // Borderline
        'daniyal.khalid@teststudent.com'     // Low scorer
      ],
      'BS Software Engineering': [
        'ali.raza@teststudent.com',
        'sara.fatima@teststudent.com',
        'waqas.chaudhry@teststudent.com',
        'ayesha.zainab@teststudent.com',
        'mustafa.qureshi@teststudent.com',
        'rimsha.kanwal@teststudent.com',
        'asadullah.baig@teststudent.com',
        'tehreem.akram@teststudent.com',
        'ahsan.javed@teststudent.com',
        'shahzaib.gill@teststudent.com'
      ],
      'BE Electrical Engineering': [
        'nimra.shahzadi@teststudent.com',
        'waqas.chaudhry@teststudent.com',
        'usman.tariq@teststudent.com',
        'khadija.zubair@teststudent.com',
        'zohaib.hassan@teststudent.com',
        'hamza.bilal@teststudent.com',
        'bilal.farooq@teststudent.com',
        'sana.shahid@teststudent.com',
        'daniyal.khalid@teststudent.com'
      ],
      'BBA': [
        'sara.fatima@teststudent.com',
        'ayesha.zainab@teststudent.com',
        'maryam.naeem@teststudent.com',
        'rimsha.kanwal@teststudent.com',
        'sana.shahid@teststudent.com',
        'tehreem.akram@teststudent.com',
        'laiba.nisar@teststudent.com',
        'mahnoor.abbasi@teststudent.com',
        'faisal.rasheed@teststudent.com',
        'amna.tanveer@teststudent.com',
        'hina.parveen@teststudent.com',
        'shahzaib.gill@teststudent.com'
      ],
      'BBIT': [
        'waqas.chaudhry@teststudent.com',
        'ayesha.zainab@teststudent.com',
        'zohaib.hassan@teststudent.com',
        'asadullah.baig@teststudent.com',
        'tehreem.akram@teststudent.com',
        'ahsan.javed@teststudent.com',
        'laiba.nisar@teststudent.com',
        'mahnoor.abbasi@teststudent.com',
        'faisal.rasheed@teststudent.com'
      ],
      'BS Data Science': [
        'ali.raza@teststudent.com',
        'nimra.shahzadi@teststudent.com',
        'khadija.zubair@teststudent.com',
        'mustafa.qureshi@teststudent.com',
        'maryam.naeem@teststudent.com',
        'rimsha.kanwal@teststudent.com',
        'bilal.farooq@teststudent.com',
        'sana.shahid@teststudent.com',
        'hina.parveen@teststudent.com'
      ]
    };

    // Inject ABC student into program applications if found in database
    if (abcUser) {
      const abcEmail = abcUser.email;
      // Add ABC to BS Computer Science (near top for high ranking) and BS Software Engineering
      if (programApplications['BS Computer Science'] && !programApplications['BS Computer Science'].includes(abcEmail)) {
        programApplications['BS Computer Science'].splice(1, 0, abcEmail); // Insert at position 2 (high rank)
      }
      if (programApplications['BS Software Engineering'] && !programApplications['BS Software Engineering'].includes(abcEmail)) {
        programApplications['BS Software Engineering'].splice(1, 0, abcEmail);
      }
      console.log(`  📌 Added ABC (${abcEmail}) to BS Computer Science & BS Software Engineering applications.`);
    }

    // Build a quick email->student lookup
    const emailToStudent = {};
    for (const { user, entry_test_marks } of studentUsers) {
      emailToStudent[user.email] = { user, entry_test_marks };
    }

    console.log('📝 Creating realistic per-program applications...');
    let totalApps = 0;

    for (const [programName, applicantEmails] of Object.entries(programApplications)) {
      const program = programMap[programName];
      if (!program) {
        console.log(`  ⚠️ Program "${programName}" not found, skipping.`);
        continue;
      }

      let priority = 1;
      for (const email of applicantEmails) {
        const student = emailToStudent[email];
        if (!student) {
          console.log(`  ⚠️ Student "${email}" not found, skipping.`);
          continue;
        }
        const { user, entry_test_marks } = student;
        const matricPct = Math.round((user.matric_obtained_marks / user.matric_total_marks) * 10000) / 100;
        const fscPct = Math.round((user.inter_obtained_marks / user.inter_total_marks) * 10000) / 100;

        await Application.findOneAndUpdate(
          { user_id: user._id, program_id: program._id },
          {
            user_id: user._id,
            program_id: program._id,
            status: 'pending',
            priority: Math.min(priority++, 5),
            matric_percentage: matricPct,
            fsc_percentage: fscPct,
            entry_test_marks: entry_test_marks,
            cnic: user.cnic,
            phone: user.phone,
            address: user.address,
            documents: [
              { type: 'cnic', url: 'https://example.com/docs/cnic.pdf', filename: 'cnic.pdf' },
              { type: 'matric', url: 'https://example.com/docs/matric.pdf', filename: 'matric_result.pdf' },
              { type: 'fsc', url: 'https://example.com/docs/fsc.pdf', filename: 'fsc_result.pdf' },
              { type: 'entry_test', url: 'https://example.com/docs/entry_test.pdf', filename: 'entry_test.pdf' }
            ],
            application_date: new Date()
          },
          { upsert: true, new: true }
        );
        totalApps++;
      }
      console.log(`  📄 ${programName}: ${applicantEmails.length} applications`);
    }
    console.log(`✅ ${totalApps} total applications created across ${Object.keys(programApplications).length} programs.`);

    // 4. Generate Merit Lists
    console.log('⚖️ Generating Merit Lists...');
    for (const program of allPrograms) {
      const pendingApps = await Application.find({
        program_id: program._id,
        status: 'pending'
      }).populate('user_id', 'full_name email cnic phone');

      if (!pendingApps || pendingApps.length === 0) {
        console.log(`  ℹ️ No pending apps for "${program.name}"`);
        continue;
      }

      const scoredApps = pendingApps.map(app => {
        const fsc = app.fsc_percentage || 0;
        const matric = app.matric_percentage || fsc;
        const entryTest = app.entry_test_marks || 0;
        let score = entryTest > 0
          ? (fsc * 0.5) + (entryTest * 0.3) + (matric * 0.2)
          : (fsc * 0.7) + (matric * 0.3);
        return { app, score: Math.round(score * 100) / 100 };
      });

      scoredApps.sort((a, b) => b.score - a.score);

      const totalSeats = program.total_seats || 8;
      const meritSeats = Math.floor(totalSeats * 0.8);
      const quotaSeats = Math.floor(totalSeats * 0.1);

      let rank = 1;
      for (let i = 0; i < scoredApps.length; i++) {
        const { app, score } = scoredApps[i];
        let category = 'merit';
        if (i >= meritSeats && i < meritSeats + quotaSeats) category = 'quota';
        else if (i >= meritSeats + quotaSeats) category = 'self_finance';

        const status = i < totalSeats ? 'approved' : 'waitlisted';

        await Application.findByIdAndUpdate(app._id, {
          status,
          merit_list_number: 1,
          remarks: `Category: ${category}, Rank: ${rank++}, Score: ${score}%`
        });
      }

      program.current_merit_list = 1;
      await program.save();

      const selected = scoredApps.slice(0, totalSeats).length;
      const waitlisted = Math.max(0, scoredApps.length - totalSeats);
      console.log(`  🏆 ${program.name}: ${scoredApps.length} applicants → ${selected} selected, ${waitlisted} waitlisted (Merit List #1)`);
    }

    console.log('\n🎉 DONE! Realistic test data seeded successfully.');
    console.log('Each student only appears in programs they applied to.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

runSeeder();
