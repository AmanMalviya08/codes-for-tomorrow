// controllers/resetController.js
const { validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendVerificationEmail } = require('../utils/emailService');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return same success message to avoid leaking which emails exist
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset code shortly.'
      });
    }

    // Delete any existing password reset OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase(), type: 'password_reset' });

    // Generate new OTP
    const otp = generateOTP();
    await OTP.create({
      email: user.email,
      otp,
      type: 'password_reset'
    });

    // Send email with OTP
    const emailResult = await sendVerificationEmail(user.email, otp, user.firstName, 'password_reset');

    // If sending failed, log and return a safe error message
    if (!emailResult || !emailResult.success) {
      console.error('[resetController] emailResult failure:', emailResult);
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again.' });
    }

    // Prepare response
    const responsePayload = {
      success: true,
      message: 'Password reset code has been sent to your email. Code will expire in 10 minutes.'
    };

    if (process.env.NODE_ENV !== 'production' && emailResult.previewUrl) {
      responsePayload.previewUrl = emailResult.previewUrl;
    }

    return res.json(responsePayload);
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process password reset request' });
  }
};

const verifyResetOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'password_reset',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    return res.json({ 
      success: true, 
      message: 'Valid reset code', 
      data: { 
        email: otpRecord.email,
        canResetPassword: true
      } 
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify reset code' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, otp, newPassword } = req.body;

    // Find and validate OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type: 'password_reset',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    return res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

module.exports = { 
  forgotPassword, 
  verifyResetOTP, 
  resetPassword 
};