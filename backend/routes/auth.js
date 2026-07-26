import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadFileToGridFS, deleteFileFromGridFS, getGridFS } from '../utils/gridfs.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().notEmpty(),
  body('cnic').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, cnic, phone, address } = req.body;

    // Force role to always be student - admin registration not allowed
    const role = 'student';

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      full_name,
      role,
      cnic,
      phone,
      address,
      is_active: true
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Student registered successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register student' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Login attempt:', email);

    const user = await User.findOne({ email });
    console.log('User found:', user ? 'YES' : 'NO');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      console.log('Account deactivated');
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    console.log('Comparing password...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Updating last login...');
    try {
      user.last_login = new Date();
      await user.save();
      console.log('Last login updated');
    } catch (updateError) {
      console.error('Failed to update last_login:', updateError);
    }

    console.log('Generating token...');
    let token;
    try {
      token = generateToken(user);
      console.log('Token generated successfully');
    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      return res.status(500).json({ error: 'Failed to generate authentication token' });
    }

    console.log('Sending response...');
    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        cnic: user.cnic,
        phone: user.phone,
        address: user.address,
        avatar_url: user.avatar_url
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.put('/profile', authenticateToken, [
  body('full_name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('cnic').optional({ checkFalsy: true }).trim(),
  body('father_name').optional({ checkFalsy: true }).trim(),
  body('date_of_birth').optional({ checkFalsy: true }).trim(),
  body('gender').optional({ checkFalsy: true }).trim(),
  body('alternate_phone').optional({ checkFalsy: true }).trim(),
  body('father_phone').optional({ checkFalsy: true }).trim(),
  body('permanent_address').optional({ checkFalsy: true }).trim(),
  body('matric_board').optional({ checkFalsy: true }).trim(),
  body('matric_passing_year').optional({ checkFalsy: true }).isInt(),
  body('matric_obtained_marks').optional({ checkFalsy: true }).isInt(),
  body('matric_total_marks').optional({ checkFalsy: true }).isInt(),
  body('inter_board').optional({ checkFalsy: true }).trim(),
  body('inter_passing_year').optional({ checkFalsy: true }).isInt(),
  body('inter_obtained_marks').optional({ checkFalsy: true }).isInt(),
  body('inter_total_marks').optional({ checkFalsy: true }).isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      full_name, phone, address, avatar_url, cnic,
      father_name, date_of_birth, gender, alternate_phone, father_phone, permanent_address,
      matric_board, matric_passing_year, matric_obtained_marks, matric_total_marks,
      inter_board, inter_passing_year, inter_obtained_marks, inter_total_marks
    } = req.body;
    const updates = {};

    if (full_name) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone || null;
    if (address !== undefined) updates.address = address || null;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (cnic !== undefined) updates.cnic = cnic || null;
    if (father_name !== undefined) updates.father_name = father_name || null;
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth || null;
    if (gender !== undefined) updates.gender = gender || null;
    if (alternate_phone !== undefined) updates.alternate_phone = alternate_phone || null;
    if (father_phone !== undefined) updates.father_phone = father_phone || null;
    if (permanent_address !== undefined) updates.permanent_address = permanent_address || null;
    if (matric_board !== undefined) updates.matric_board = matric_board || null;
    if (matric_passing_year !== undefined) updates.matric_passing_year = matric_passing_year || null;
    if (matric_obtained_marks !== undefined) updates.matric_obtained_marks = matric_obtained_marks || null;
    if (matric_total_marks !== undefined) updates.matric_total_marks = matric_total_marks || null;
    if (inter_board !== undefined) updates.inter_board = inter_board || null;
    if (inter_passing_year !== undefined) updates.inter_passing_year = inter_passing_year || null;
    if (inter_obtained_marks !== undefined) updates.inter_obtained_marks = inter_obtained_marks || null;
    if (inter_total_marks !== undefined) updates.inter_total_marks = inter_total_marks || null;
    updates.updated_at = new Date().toISOString();

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.post('/upload-avatar', authenticateToken, async (req, res) => {
  try {
    const { avatar_base64, file_name } = req.body;

    if (!avatar_base64) {
      return res.status(400).json({ error: 'Avatar data is required' });
    }

    // Convert base64 to buffer
    const base64Data = avatar_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const fileExt = file_name ? file_name.split('.').pop() : 'png';
    const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;

    // Upload file to GridFS (MongoDB storage bucket)
    const fileId = await uploadFileToGridFS(buffer, fileName, {
      userId: req.user.id,
      contentType: `image/${fileExt}`
    });

    // Store GridFS file ID as avatar URL
    const avatarUrl = `/api/auth/avatar/${fileId}`;

    // Update user record with avatar URL
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar_url: avatarUrl },
      { new: true }
    ).select('id, email, full_name, avatar_url');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: user.avatar_url
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

router.delete('/remove-avatar', authenticateToken, async (req, res) => {
  try {
    // Get current user to check if they have an avatar
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete the file from GridFS if it exists
    if (user.avatar_url) {
      try {
        const fileId = user.avatar_url.split('/').pop();
        if (fileId && fileId.length === 24) {
          await deleteFileFromGridFS(fileId);
        }
      } catch (err) {
        console.log('File not found in GridFS or already deleted');
      }
    }

    // Update user record to remove avatar_url
    user.avatar_url = null;
    await user.save();

    res.json({
      message: 'Avatar removed successfully',
      avatar_url: null
    });
  } catch (error) {
    console.error('Avatar removal error:', error);
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

// Serve avatar from GridFS
router.get('/avatar/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // Validate fileId format
    if (!fileId || fileId.length !== 24) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const bucket = getGridFS();
    if (!bucket) {
      return res.status(500).json({ error: 'GridFS not initialized' });
    }

    // Find file metadata
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    // Set content type
    res.set('Content-Type', file.metadata?.contentType || 'image/png');

    // Stream file to response
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    downloadStream.pipe(res);

    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      res.status(500).json({ error: 'Failed to retrieve file' });
    });
  } catch (error) {
    console.error('Avatar retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve avatar' });
  }
});

export default router;
