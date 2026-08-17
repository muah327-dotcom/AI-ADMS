import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    required: true
  },
  duration_years: {
    type: Number,
    default: 4
  },
  total_seats: {
    type: Number,
    default: 0
  },
  min_percentage: {
    type: Number,
    default: 0
  },
  required_subjects: [{
    type: String
  }],
  admission_fee: {
    type: Number,
    default: 15000
  },
  tuition_fee: {
    type: Number,
    default: 65000
  },
  total_fee: {
    type: Number,
    default: 80000
  },
  bank_name: {
    type: String,
    default: 'Habib Bank Limited (HBL)'
  },
  account_number: {
    type: String,
    default: 'PK78HABB00012345678901'
  },
  account_title: {
    type: String,
    default: 'University Admission Office'
  },
  fee_deadline: {
    type: Date,
    default: null
  },
  current_merit_list: {
    type: Number,
    default: 1
  },
  field_category: {
    type: String,
    enum: ['Computer Science', 'Information Technology', 'Software Engineering', 'Engineering', 'Business', 'Medical', 'Arts & Humanities', 'Basic Sciences', 'Other'],
    default: 'Computer Science'
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'Self Finance'],
    default: 'Morning'
  },
  historical_cutoff: {
    type: Number,
    default: function() {
      return this.min_percentage || 60;
    }
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

programSchema.index({ department: 1 });
programSchema.index({ is_active: 1 });

const Program = mongoose.model('Program', programSchema);

export default Program;
