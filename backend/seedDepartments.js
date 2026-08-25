import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Department from './models/Department.js';
import Program from './models/Program.js';

const departmentsToSeed = [
  {
    name: 'Computer Science',
    programs: [
      'BS Computer Science',
      'BS Information Technology',
      'BS Software Engineering',
      'BS Data Science'
    ]
  },
  {
    name: 'Business Administration',
    programs: [
      'BBA',
      'BS Accounting & Finance',
      'BS Marketing',
      'BS Management'
    ]
  },
  {
    name: 'Mass Communication',
    programs: [
      'BS Mass Communication',
      'BS Journalism',
      'BS Media Studies'
    ]
  },
  {
    name: 'Artificial Intelligence',
    programs: [
      'BS Artificial Intelligence',
      'BS Data Science (AI)',
      'BS Machine Learning'
    ]
  },
  {
    name: 'Engineering',
    programs: [
      'BS Electrical Engineering',
      'BS Mechanical Engineering',
      'BS Civil Engineering'
    ]
  }
];

const seedData = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected.');

    for (const depData of departmentsToSeed) {
      // Upsert department
      let department = await Department.findOne({ name: depData.name });
      if (!department) {
        department = await Department.create({
          name: depData.name,
          description: `Department of ${depData.name}`
        });
        console.log(`Created department: ${department.name}`);
      } else {
        console.log(`Department already exists: ${department.name}`);
      }

      // Upsert programs for this department
      for (const progName of depData.programs) {
        let program = await Program.findOne({ name: progName });
        if (!program) {
          await Program.create({
            name: progName,
            department: department.name, // Using String as requested
            description: `Program for ${progName}`,
            duration_years: 4,
            total_seats: 50,
            min_percentage: 60,
            is_active: true
          });
          console.log(`  - Created program: ${progName}`);
        } else {
          // ensure the department is correct
          if (program.department !== department.name) {
            program.department = department.name;
            await program.save();
            console.log(`  - Updated program department: ${progName}`);
          } else {
            console.log(`  - Program already exists: ${progName}`);
          }
        }
      }
    }

    console.log('Seed completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
