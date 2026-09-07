import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Program from './models/Program.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university_admission';

const seedProgramsMetadata = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Also update existing Programs with field_category, shift and historical_cutoff
    const programs = await Program.find();
    for (const prog of programs) {
      let fieldCat = 'Computer Science';
      const pName = (prog.name || '').toLowerCase();
      if (pName.includes('information tech') || pName.includes('it') || pName.includes('bsit')) fieldCat = 'Information Technology';
      else if (pName.includes('software') || pName.includes('se') || pName.includes('bsse')) fieldCat = 'Software Engineering';
      else if (pName.includes('business') || pName.includes('bba') || pName.includes('finance')) fieldCat = 'Business';
      else if (pName.includes('engineer')) fieldCat = 'Engineering';
      else if (pName.includes('math') || pName.includes('physic') || pName.includes('chem')) fieldCat = 'Basic Sciences';

      prog.field_category = fieldCat;
      prog.shift = prog.shift || 'Morning';
      prog.historical_cutoff = prog.historical_cutoff || prog.min_percentage || 65;
      await prog.save();
    }
    console.log(`Updated ${programs.length} programs with metadata.`);

    // If needed, create an Evening / Self-Finance program option for comparison
    const hasEveningCS = await Program.findOne({ name: /Evening/i });
    if (!hasEveningCS && programs.length > 0) {
      const baseProg = programs[0];
      await Program.create({
        name: `${baseProg.name} (Evening Shift)`,
        description: `Evening shift offering of ${baseProg.name} with identical syllabus and flexible timetable.`,
        department: baseProg.department,
        duration_years: baseProg.duration_years,
        total_seats: 50,
        min_percentage: Math.max(45, (baseProg.min_percentage || 70) - 10),
        historical_cutoff: Math.max(48, (baseProg.historical_cutoff || 70) - 8),
        required_subjects: baseProg.required_subjects,
        admission_fee: baseProg.admission_fee,
        tuition_fee: baseProg.tuition_fee,
        total_fee: baseProg.total_fee,
        field_category: baseProg.field_category || 'Computer Science',
        shift: 'Evening',
        is_active: true
      });
      console.log('Created sample Evening shift program option.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedProgramsMetadata();
