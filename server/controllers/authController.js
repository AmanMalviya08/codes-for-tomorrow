// controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendVerificationEmail } = require('../utils/emailService');

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ sub: userId.toString() }, secret, { expiresIn, algorithm: 'HS256' });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    // Create user (not verified yet)
    const user = new User({ firstName, lastName, email, password, isEmailVerified: false });
    await user.save();

    // Generate and send OTP
    const otp = generateOTP();
    await OTP.create({
      email: user.email,
      otp,
      type: 'email_verification'
    });

    const emailResult = await sendVerificationEmail(user.email, otp, user.firstName, 'email_verification');

    if (!emailResult || !emailResult.success) {
      // Delete the user if email fails to send
      await User.findByIdAndDelete(user._id);
      console.error('[authController] Email sending failed:', emailResult);
      return res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again.' });
    }

    const responsePayload = {
      success: true,
      message: 'Account created successfully. Please check your email for verification code.',
      data: {
        email: user.email,
        requiresVerification: true
      }
    };

    // Include preview URL in non-production
    if (process.env.NODE_ENV !== 'production' && emailResult.previewUrl) {
      responsePayload.previewUrl = emailResult.previewUrl;
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Failed to create account' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'email_verification',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // Find and update user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    user.isEmailVerified = true;
    await user.save();

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          fullName: user.fullName,
          isEmailVerified: user.isEmailVerified
        }
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    // Delete existing OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase(), type: 'email_verification' });

    // Generate new OTP
    const otp = generateOTP();
    await OTP.create({
      email: user.email,
      otp,
      type: 'email_verification'
    });

    const emailResult = await sendVerificationEmail(user.email, otp, user.firstName, 'email_verification');

    if (!emailResult || !emailResult.success) {
      console.error('[authController] Email sending failed:', emailResult);
      return res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again.' });
    }

    const responsePayload = {
      success: true,
      message: 'Verification code sent successfully. Please check your email.'
    };

    if (process.env.NODE_ENV !== 'production' && emailResult.previewUrl) {
      responsePayload.previewUrl = emailResult.previewUrl;
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend verification code' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: user.email
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          fullName: user.fullName,
          isEmailVerified: user.isEmailVerified
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

module.exports = { 
  signup, 
  login, 
  verifyEmail, 
  resendVerificationCode, 
  generateToken 
};