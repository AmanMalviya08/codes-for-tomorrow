// src/pages/VerifyEmail.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { saveToken } from '../utils/auth';
import Input from '../components/Input';

type VerifyFormData = {
  otp: string;
};

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // For Ethereal preview / test email handling
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isTestEmail, setIsTestEmail] = useState<boolean>(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<VerifyFormData>();

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer as NodeJS.Timeout);
    };
  }, [countdown]);

  const onSubmit = async (data: VerifyFormData) => {
    if (!email) {
      alert('Email is required. Please go back to signup.');
      return;
    }

    try {
      const res = await api.post('/auth/verify-email', {
        email,
        otp: data.otp
      });

      if (res?.data?.success) {
        const token = res?.data?.data?.token;
        // backend might also include previewUrl & isTest flags for dev
        if (res?.data?.previewUrl) {
          setPreviewUrl(res.data.previewUrl);
          setIsTestEmail(Boolean(res?.data?.isTest));
        }

        if (token) {
          saveToken(token);
          // api.defaults header set in saveToken now
          // pass an ephemeral flag so Profile can refresh & show toast
          navigate('/profile', { state: { justVerified: true } });
        } else {
          alert('Verification successful but no token received. Please login.');
          navigate('/login');
        }
      } else {
        alert(res?.data?.message || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      alert(err?.response?.data?.message || err?.message || 'Verification failed');
    }
  };

  const handleResendCode = async () => {
    if (!email || countdown > 0) return;

    setIsResending(true);
    setPreviewUrl(null);
    setIsTestEmail(false);

    try {
      const res = await api.post('/auth/resend-verification', { email });

      if (res?.data?.success) {
        // backend returns { previewUrl, isTest } when using Ethereal
        if (res?.data?.previewUrl) {
          setPreviewUrl(res.data.previewUrl);
          setIsTestEmail(Boolean(res?.data?.isTest));
        }

        // friendly non-blocking info instead of just alert for preview links
        if (res?.data?.previewUrl) {
          // keep a small notice in-page; also open if you want (commented)
          // window.open(res.data.previewUrl, '_blank');
          console.info('[verify] preview url', res.data.previewUrl);
        } else {
          // fallback to simple alert for normal SMTP success
          alert(res.data.message || 'Verification code sent successfully!');
        }

        setCountdown(60); // 60 second cooldown
      } else {
        alert(res?.data?.message || 'Failed to resend code');
      }
    } catch (err: any) {
      console.error('Resend error:', err);
      alert(err?.response?.data?.message || err?.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  const formatOTP = (value: string) => {
    // Remove any non-digit characters and limit to 6 digits
    const digits = value.replace(/\D/g, '').substring(0, 6);
    return digits;
  };

  const otpValue = watch('otp') || '';

  const openPreview = () => {
    if (!previewUrl) return;
    try {
      window.open(previewUrl, '_blank');
    } catch (e) {
      console.warn('Could not open preview URL', e);
    }
  };

  const copyPreview = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      // small non-blocking UI feedback
      // you can replace with toast if using a library
      alert('Preview URL copied to clipboard');
    } catch (err) {
      console.error('copy error', err);
      alert('Could not copy preview URL');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-6">
        <div className="mb-4">
          <div className="rounded-full bg-blue-100 w-20 h-20 flex items-center justify-content-center mx-auto mb-4">
            <i className="bi bi-envelope-check text-blue-600" style={{ fontSize: '2rem' }}></i>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Verify your email</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter the 6-digit code we sent to<br />
          <span className="font-medium text-slate-700">{email}</span>
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl p-6 md:p-8 ring-1 ring-slate-100">
        {/* If previewUrl exists (Ethereal/dev), show an inline info box */}
        {previewUrl && (
          <div className="alert alert-info d-flex align-items-start mb-4" role="alert">
            <div className="flex-grow-1">
              <strong>Test email preview available</strong>
              <div className="small text-muted">
                This is a development preview (Ethereal). The email is not delivered to the real inbox.
              </div>
              <div className="mt-2 d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" onClick={openPreview}>
                  Open Preview
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={copyPreview}>
                  Copy Preview URL
                </button>
              </div>
              <div className="mt-2 small text-break">
                <span className="text-muted">Preview URL: </span>
                <a href={previewUrl} target="_blank" rel="noreferrer" className="ms-1" onClick={(e) => e.stopPropagation()}>
                  {previewUrl.length > 80 ? previewUrl.slice(0, 80) + '…' : previewUrl}
                </a>
              </div>
            </div>
            <div className="ms-3">
              <span className="badge bg-info">DEV</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email input (read-only) */}
          <div className="form-outline mb-4">
            <Input
              id="verifyEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              readOnly
            />
            <label className="form-label" htmlFor="verifyEmail">Email Address</label>
          </div>

          {/* OTP Input */}
          <div className="form-outline mb-4">
            <Input
              id="verifyOTP"
              type="text"
              maxLength={6}
              placeholder="000000"
              {...register('otp', {
                required: 'Verification code is required',
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
            <label className="form-label" htmlFor="verifyOTP">Verification Code</label>
          </div>

          {/* Visual OTP Display */}
          <div className="mb-4">
            <div className="flex justify-content-center gap-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className={`w-12 h-12 border-2 rounded-lg flex items-center justify-content-center text-xl font-mono ${
                    otpValue[index]
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
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

          {/* Submit button */}
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
              'Verify Email'
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

          {/* Back to signup */}
          <div className="text-center">
            <p className="text-sm">
              Wrong email? <Link to="/signup" className="text-blue-600">Sign up again</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
