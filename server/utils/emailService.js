// utils/emailService.js
require('dotenv').config();
const nodemailer = require('nodemailer');

// Helper function to create SMTP transporter
const createSmtpTransporter = ({ host, port, secure, user, pass }) => {
  return nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for other ports
    auth: {
      user,
      pass
    }
  });
};

// Helper function to create Ethereal test transporter
const createTestTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  return { transporter, info: { isTest: true, previewAccount: testAccount } };
};

// Helper function to verify transporter
const verifyTransporter = (transporter) => {
  return new Promise((resolve, reject) => {
    transporter.verify((err, success) => {
      if (err) return reject(err);
      resolve(success);
    });
  });
};

// Main function to create transporter with fallback
const createTransporterWithFallback = async () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '465', 10);
  const secure = port === 465;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // Try to use real SMTP if all required env vars are present
  if (host && user && pass) {
    try {
      console.log('[emailService] Attempting to connect to SMTP server...');
      const transporter = createSmtpTransporter({ host, port, secure, user, pass });
      await verifyTransporter(transporter);
      console.log('[emailService] ✅ SMTP connection successful');
      return { transporter, info: { isTest: false } };
    } catch (err) {
      console.error('[emailService] ❌ SMTP verify failed:', err?.message || err);
      console.log('[emailService] Falling back to Ethereal test account...');
    }
  } else {
    console.warn('[emailService] EMAIL_HOST/EMAIL_USER/EMAIL_PASS not fully configured, falling back to Ethereal test account for dev.');
  }

  // Fallback to Ethereal (safe for dev)
  try {
    const test = await createTestTransporter();
    console.info('[emailService] Using Ethereal test account. Preview URL will be returned in response.');
    return test;
  } catch (err) {
    console.error('[emailService] Failed to create test (Ethereal) account:', err);
    throw new Error('No working email transporter available');
  }
};

// Email templates
const getEmailTemplate = (otp, firstName, type) => {
  const templates = {
    email_verification: {
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
          <h2 style="color: #007bff; margin-bottom: 20px;">Welcome ${firstName || 'there'}!</h2>
          <p>Thank you for registering with us. Please verify your email address using the code below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; border: 2px dashed #007bff; padding: 20px; display: inline-block; border-radius: 8px;">
              <h1 style="margin: 0; color: #007bff; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            </div>
          </div>
          <p><strong>Note:</strong> This verification code will expire in 10 minutes for your security.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #777;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    },
    password_reset: {
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
          <h2 style="color: #dc3545; margin-bottom: 20px;">Password Reset Request</h2>
          <p>Hi ${firstName || 'there'},</p>
          <p>We received a request to reset your password. Use the verification code below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; border: 2px dashed #dc3545; padding: 20px; display: inline-block; border-radius: 8px;">
              <h1 style="margin: 0; color: #dc3545; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            </div>
          </div>
          <p><strong>Note:</strong> This verification code will expire in 10 minutes for your security.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #777;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    }
  };

  return templates[type] || templates.email_verification;
};

// Main function to send verification email
const sendVerificationEmail = async (email, otp, firstName, type = 'email_verification') => {
  try {
    const { transporter, info } = await createTransporterWithFallback();
    const template = getEmailTemplate(otp, firstName, type);

    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL_USER || 'no-reply@example.com'}>`,
      to: email,
      subject: template.subject,
      html: template.html
    };

    const infoSent = await transporter.sendMail(mailOptions);
    
    // Generate preview URL for Ethereal (if available)
    const testPreview = nodemailer.getTestMessageUrl(infoSent) || null;

    console.info('[emailService] Mail sent successfully');
    console.log('[emailService] Message ID:', infoSent.messageId);
    if (testPreview) {
      console.log('[emailService] Preview URL:', testPreview);
    }
    
    return { 
      success: true, 
      messageId: infoSent.messageId, 
      previewUrl: testPreview,
      isTest: info?.isTest || false
    };
  } catch (error) {
    console.error('[emailService] Email sending failed:', error);
    return { 
      success: false, 
      error: (error && error.message) ? error.message : 'Email send failed',
      isTest: false
    };
  }
};

// Function to send password reset email
const sendPasswordResetEmail = async (email, resetToken, firstName) => {
  try {
    const { transporter, info } = await createTransporterWithFallback();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL_USER || 'no-reply@example.com'}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
          <h2 style="margin-bottom: 20px;">Hi ${firstName || 'there'},</h2>
          <p>We received a request to reset your password. Click the button below to set a new one.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: #fff; padding: 12px 20px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p><strong>Note:</strong> This link will expire in a few minutes for your security.</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #777;">
            If you didn't request this, ignore this email.
          </p>
        </div>
      `
    };

    const infoSent = await transporter.sendMail(mailOptions);
    const testPreview = nodemailer.getTestMessageUrl(infoSent) || null;

    console.info('[emailService] Password reset mail sent successfully');
    console.log('[emailService] Message ID:', infoSent.messageId);
    if (testPreview) {
      console.log('[emailService] Preview URL:', testPreview);
    }
    
    return { 
      success: true, 
      messageId: infoSent.messageId, 
      previewUrl: testPreview,
      isTest: info?.isTest || false
    };
  } catch (error) {
    console.error('[emailService] Password reset email sending failed:', error);
    return { 
      success: false, 
      error: (error && error.message) ? error.message : 'Email send failed',
      isTest: false
    };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};