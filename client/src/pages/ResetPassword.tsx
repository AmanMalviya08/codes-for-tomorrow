// src/pages/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import Input from '../components/Input';

type ResetPasswordFormData = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { 
    register, 
    handleSubmit, 
    watch, 
    setValue,
    formState: { errors, isSubmitting } 
  } = useForm<ResetPasswordFormData>({
    defaultValues: { email }
  });

  // Update email in form when state changes
  useEffect(() => {
    setValue('email', email);
  }, [email, setValue]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const extractError = (err: any) => {
    if (!err) return 'Request failed';
    const d = err?.response?.data;
    if (d?.errors && Array.isArray(d.errors)) return d.errors.map((e: any) => e.msg || e.message).join(', ');
    return d?.message || err.message || 'Request failed';
  };

  const formatOTP = (value: string) => {
    // Remove any non-digit characters and limit to 6 digits
    const digits = value.replace(/\D/g, '').substring(0, 6);
    return digits;
  };

  // Step 1: Verify OTP
  const onVerifyOTP = async (data: ResetPasswordFormData) => {
    try {
      const res = await api.post('/reset/verify-reset-otp', {
        email: data.email,
        otp: data.otp
      });

      if (res?.data?.success) {
        alert(res.data.message || 'OTP verified successfully!');
        setStep('reset');
      } else {
        alert(res?.data?.message || 'OTP verification failed');
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
      alert(extractError(err));
    }
  };

  // Step 2: Reset Password
  const onResetPassword = async (data: ResetPasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const res = await api.post('/reset/reset-password', {
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      });

      if (res?.data?.success) {
        alert(res.data.message || 'Password reset successful! You can now login.');
        navigate('/login');
      } else {
        alert(res?.data?.message || 'Password reset failed');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      alert(extractError(err));
    }
  };

  const handleResendCode = async () => {
    if (!email || countdown > 0) return;

    setIsResending(true);
    try {
      const res = await api.post('/reset/forgot-password', { email });
      
      if (res?.data?.success) {
        // If using Ethereal dev preview
        if (res?.data?.previewUrl) {
          try { 
            window.open(res.data.previewUrl, '_blank'); 
          } catch (e) { 
            console.warn('Could not open preview URL'); 
          }
        }

        alert(res.data.message || 'Reset code sent successfully!');
        setCountdown(60); // 60 second cooldown
      } else {
        alert(res?.data?.message || 'Failed to resend code');
      }
    } catch (err: any) {
      console.error('Resend error:', err);
      alert(extractError(err));
    } finally {
      setIsResending(false);
    }
  };

  const otpValue = watch('otp') || '';
  const newPassword = watch('newPassword') || '';

  if (step === 'verify') {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-6">
          <div className="mb-4">
            <div className="rounded-full bg-orange-100 w-20 h-20 flex items-center justify-content-center mx-auto mb-4">
              <i className="bi bi-shield-lock text-orange-600" style={{ fontSize: '2rem' }}></i>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Verify reset code</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter the 6-digit code we sent to<br />
            <span className="font-medium text-slate-700">{email}</span>
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-2xl p-6 md:p-8 ring-1 ring-slate-100">
          <form onSubmit={handleSubmit(onVerifyOTP)} className="space-y-6">
            {/* Email input */}
            <div className="form-outline mb-4">
              <Input
                id="resetEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
              />
              <label className="form-label" htmlFor="resetEmail">Email Address</label>
            </div>

            {/* OTP Input */}
            <div className="form-outline mb-4">
              <Input
                id="resetOTP"
                type="text"
                maxLength={6}
                placeholder="000000"
                {...register('otp', {
                  required: 'Reset code is required',
                  minLength: { value: 6, message: 'Code must be 6 digits' },
                  maxLength: { value: 6, message: 'Code must be 6 digits' },
                  pattern: { value: /^\d{6}$/, message: 'Code must be 6 digits' }
                })}
                onChange={(e) => {
                  e.target.value = formatOTP(e.target.value);
                }}
                error={errors.otp?.message}
                style={{
                  fontSize: '1.5rem',
                  textAlign: 'center',
                  letterSpacing: '0.5em',
                  fontFamily: 'monospace'
                }}
              />
              <label className="form-label" htmlFor="resetOTP">Reset Code</label>
            </div>

            {/* Visual OTP Display */}
            <div className="mb-4">
              <div className="flex justify-content-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className={`w-12 h-12 border-2 rounded-lg flex items-center justify-content-center text-xl font-mono ${
                      otpValue[index] 
                        ? 'border-orange-500 bg-orange-50 text-orange-700' 
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {otpValue[index] || ''}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                {otpValue.length}/6 digits entered
              </p>
            </div>

            {/* Verify button */}
            <button
              type="submit"
              disabled={isSubmitting || otpValue.length !== 6}
              className="btn btn-primary w-100 mb-4"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            {/* Resend code */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending || countdown > 0}
                className="btn btn-outline-secondary btn-sm"
              >
                {isResending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  'Resend code'
                )}
              </button>
            </div>

            {/* Code info */}
            <div className="alert alert-info" role="alert">
              <div className="d-flex">
                <i className="bi bi-info-circle-fill me-2"></i>
                <div>
                  <strong>Code expires in 10 minutes</strong>
                  <p className="mb-0 small">Check your spam folder if you don't see the email.</p>
                </div>
              </div>
            </div>

            {/* Back to forgot password */}
            <div className="text-center">
              <p className="text-sm">
                Wrong email? <Link to="/forgot-password" className="text-blue-600">Try again</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Reset Password Form
  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-6">
        <div className="mb-4">
          <div className="rounded-full bg-green-100 w-20 h-20 flex items-center justify-content-center mx-auto mb-4">
            <i className="bi bi-check-circle text-green-600" style={{ fontSize: '2rem' }}></i>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Create new password</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your reset code has been verified. Set your new password below.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl p-6 md:p-8 ring-1 ring-slate-100">
        <form onSubmit={handleSubmit(onResetPassword)} className="space-y-4">
          {/* New Password */}
          <div className="form-outline mb-4">
            <Input
              id="newPassword"
              type="password"
              placeholder="New password"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
                pattern: { 
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
                  message: 'Password must contain lowercase, uppercase, and number' 
                }
              })}
              error={errors.newPassword?.message}
            />
            <label className="form-label" htmlFor="newPassword">New Password</label>
          </div>

          {/* Confirm Password */}
          <div className="form-outline mb-4">
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === newPassword || 'Passwords must match'
              })}
              error={errors.confirmPassword?.message}
            />
            <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
          </div>

          {/* Password requirements */}
          <div className="alert alert-light" role="alert">
            <small>
              <strong>Password requirements:</strong>
              <ul className="mb-0 mt-1">
                <li>At least 6 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
              </ul>
            </small>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-success w-100 mb-4"
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Resetting password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm">
              <Link to="/login" className="text-blue-600">Back to login</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}