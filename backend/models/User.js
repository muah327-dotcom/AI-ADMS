import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
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
  father_name: {
    type: String,
    default: null
  },
  date_of_birth: {
    type: String,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    default: null
  },
  alternate_phone: {
    type: String,
    default: null
  },
  father_phone: {
    type: String,
    default: null
  },
  permanent_address: {
    type: String,
    default: null
  },
  matric_board: {
    type: String,
    default: null
  },
  matric_passing_year: {
    type: Number,
    default: null
  },
  matric_obtained_marks: {
    type: Number,
    default: null
  },
  matric_total_marks: {
    type: Number,
    default: null
  },
  inter_board: {
    type: String,
    default: null
  },
  inter_passing_year: {
    type: Number,
    default: null
  },
  inter_obtained_marks: {
    type: Number,
    default: null
  },
  inter_total_marks: {
    type: Number,
    default: null
  },
  avatar_url: {
    type: String,
    default: null
  },
  last_login: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

export default User;
