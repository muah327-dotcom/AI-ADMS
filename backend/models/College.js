import mongoose from 'mongoose';

const offeredProgramSchema = new mongoose.Schema({
  program_name: {
    type: String,
    required: true
  },
  field_category: {
    type: String,
    enum: ['Computer Science', 'Information Technology', 'Software Engineering', 'Engineering', 'Business', 'Medical', 'Arts & Humanities', 'Basic Sciences', 'Other'],
    default: 'Computer Science'
  },
  min_merit_cutoff: {
    type: Number,
    required: true
  },
  total_fee: {
    type: Number,
    default: 50000
  },
  total_seats: {
    type: Number,
    default: 60
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'Weekend', 'Self Finance'],
    default: 'Morning'
  }
});

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  city: {
    type: String,
    required: true
  },
  address: {
    type: String,
    default: ''
  },
  affiliation: {
    type: String,
    default: 'HEC Recognized'
  },
  ranking: {
    type: String,
    default: 'W-Category'
  },
  website_url: {
    type: String,
    default: ''
  },
  contact_email: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  offered_programs: [offeredProgramSchema],
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

collegeSchema.index({ city: 1 });
collegeSchema.index({ is_active: 1 });

const College = mongoose.model('College', collegeSchema);

export default College;
