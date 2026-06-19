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
    enum: ['pending', 'under_review', 'approved', 'rejected', 'waitlisted'],
    default: 'pending'
  },
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 5
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
      enum: ['cnic', 'matric', 'fsc', 'entry_test', 'other']
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

const Application = mongoose.model('Application', applicationSchema);

export default Application;
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
    enum: ['pending', 'under_review', 'approved', 'rejected', 'waitlisted'],
    default: 'pending'
  },
<<<<<<< HEAD
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
=======
>>>>>>> 22444604304d004f5dc6a010540d770e3147b64a
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
      enum: ['cnic', 'matric', 'fsc', 'entry_test', 'other']
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

const Application = mongoose.model('Application', applicationSchema);

export default Application;
