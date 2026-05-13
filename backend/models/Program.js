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
