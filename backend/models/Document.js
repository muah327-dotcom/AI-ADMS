import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['cnic', 'photograph', 'matric', 'intermediate', 'transcript', 'domicile', 'other'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  file_url: {
    type: String,
    default: null
  },
  file_id: {
    type: String,
    default: null
  },
  file_data: {
    type: String,
    default: null
  },
  mime_type: {
    type: String,
    default: 'application/pdf'
  },
  size: {
    type: Number,
    default: 0
  },
  extracted_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  confidence: {
    type: Number,
    default: 100
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

documentSchema.index({ user_id: 1, type: 1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;
