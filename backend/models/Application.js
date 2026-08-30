import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  program_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'waitlisted', 'confirmed', 'dropped'],
    default: 'pending'
  },
  fee_status: {
    type: String,
    enum: ['unpaid', 'submitted', 'verified', 'rejected'],
    default: 'unpaid'
  },
  fee_challan: {
    challan_number: { type: String, default: null },
    amount: { type: Number, default: 0 },
    fee_deadline: { type: Date, default: null },
    paid_receipt_url: { type: String, default: null },
    filename: { type: String, default: null },
    uploaded_at: { type: Date, default: null },
    verified_at: { type: Date, default: null },
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  fee_deadline: {
    type: Date,
    default: null
  },
  merit_list_number: {
    type: Number,
    default: 1
  },
  priority: {
    type: Number,
    default: 1
  },
  matric_percentage: {
    type: Number,
    default: null
  },
  fsc_percentage: {
    type: Number,
    default: null
  },
  entry_test_marks: {
    type: Number,
    default: null
  },
  cnic: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  address: {
    type: String,
    default: null
  },
  documents: [{
    type: {
      type: String,
      enum: ['cnic', 'photograph', 'matric', 'intermediate', 'fsc', 'transcript', 'domicile', 'entry_test', 'other'],
      default: 'other'
    },
    url: String,
    filename: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  application_date: {
    type: Date,
    default: Date.now
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewed_at: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

applicationSchema.index({ user_id: 1 });
applicationSchema.index({ program_id: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ application_date: -1 });
applicationSchema.index({ program_id: 1, status: 1 }); // compound for seat-occupancy and analytics

const Application = mongoose.model('Application', applicationSchema);

export default Application;
