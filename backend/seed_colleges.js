import mongoose from 'mongoose';
import dotenv from 'dotenv';
import College from './models/College.js';
import Program from './models/Program.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/university_admission';

const seedPartnerColleges = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const sampleColleges = [
      {
        name: 'Punjab Institute of Contemporary Technology (PICT)',
        city: 'Lahore',
        address: 'Canal Road, Near Campus Bridge, Lahore',
        affiliation: 'Affiliated with University of the Punjab / HEC Recognized',
        ranking: 'W-Category',
        website_url: 'https://pict.edu.pk',
        contact_email: 'admissions@pict.edu.pk',
        phone: '042-35890001',
        offered_programs: [
          { program_name: 'BS Information Technology (BS IT)', field_category: 'Information Technology', min_merit_cutoff: 58.0, total_fee: 55000, total_seats: 80, shift: 'Morning' },
          { program_name: 'BS Computer Science (BS CS)', field_category: 'Computer Science', min_merit_cutoff: 63.5, total_fee: 60000, total_seats: 60, shift: 'Evening' },
          { program_name: 'BS Software Engineering (BS SE)', field_category: 'Software Engineering', min_merit_cutoff: 60.0, total_fee: 58000, total_seats: 50, shift: 'Morning' },
          { program_name: 'BBA (Hons)', field_category: 'Business', min_merit_cutoff: 50.0, total_fee: 45000, total_seats: 100, shift: 'Morning' }
        ]
      },
      {
        name: 'Govt. Graduate College of Science',
        city: 'Lahore',
        address: 'Wahdat Road, Lahore',
        affiliation: 'Public Sector Degree College / BISE & HEC Affiliated',
        ranking: 'Top Tier Public College',
        website_url: 'https://ggclahore.edu.pk',
        contact_email: 'info@ggclahore.edu.pk',
        phone: '042-37800123',
        offered_programs: [
          { program_name: 'BS Computer Science (BS CS)', field_category: 'Computer Science', min_merit_cutoff: 68.0, total_fee: 25000, total_seats: 120, shift: 'Morning' },
          { program_name: 'BS Information Technology (BS IT)', field_category: 'Information Technology', min_merit_cutoff: 62.0, total_fee: 25000, total_seats: 80, shift: 'Evening' },
          { program_name: 'BS Mathematics', field_category: 'Basic Sciences', min_merit_cutoff: 52.0, total_fee: 22000, total_seats: 70, shift: 'Morning' },
          { program_name: 'BS Physics', field_category: 'Basic Sciences', min_merit_cutoff: 55.0, total_fee: 24000, total_seats: 60, shift: 'Morning' }
        ]
      },
      {
        name: 'National College of Business & Information Technology (NCBA&IT)',
        city: 'Lahore',
        address: 'Main Boulevard, Gulberg III, Lahore',
        affiliation: 'Chartered University / HEC Recognized',
        ranking: 'Category-X',
        website_url: 'https://ncba.edu.pk',
        contact_email: 'admissions@ncba.edu.pk',
        phone: '042-35753456',
        offered_programs: [
          { program_name: 'BS Software Engineering', field_category: 'Software Engineering', min_merit_cutoff: 55.0, total_fee: 65000, total_seats: 90, shift: 'Morning' },
          { program_name: 'BS Computer Science', field_category: 'Computer Science', min_merit_cutoff: 58.0, total_fee: 65000, total_seats: 90, shift: 'Evening' },
          { program_name: 'BS Business Analytics', field_category: 'Business', min_merit_cutoff: 50.0, total_fee: 55000, total_seats: 60, shift: 'Morning' }
        ]
      },
      {
        name: 'Rawalpindi Institute of Applied Sciences (RIAS)',
        city: 'Rawalpindi',
        address: 'Murree Road, Saddar, Rawalpindi',
        affiliation: 'Affiliated with Federal Universities / HEC Accredited',
        ranking: 'W-Category',
        website_url: 'https://rias.edu.pk',
        contact_email: 'helpdesk@rias.edu.pk',
        phone: '051-5567890',
        offered_programs: [
          { program_name: 'BS Computer Science', field_category: 'Computer Science', min_merit_cutoff: 60.0, total_fee: 48000, total_seats: 75, shift: 'Morning' },
          { program_name: 'BS Information Technology', field_category: 'Information Technology', min_merit_cutoff: 54.0, total_fee: 45000, total_seats: 60, shift: 'Evening' },
          { program_name: 'BS Accounting & Finance', field_category: 'Business', min_merit_cutoff: 48.0, total_fee: 40000, total_seats: 80, shift: 'Morning' }
        ]
      }
    ];

    for (const c of sampleColleges) {
      await College.findOneAndUpdate({ name: c.name }, c, { upsert: true, new: true });
    }
    console.log(`Seeded ${sampleColleges.length} partner colleges successfully.`);

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

seedPartnerColleges();
