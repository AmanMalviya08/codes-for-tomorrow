// src/pages/ForgotPassword.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import Input from '../components/Input';
import { useNavigate, Link } from 'react-router-dom';

type ForgotPasswordFormData = {
  email: string;
};

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormData>();
  const navigate = useNavigate();

  const extractError = (err: any) => {
    if (!err) return 'Request failed';
    const d = err?.response?.data;
    if (d?.errors && Array.isArray(d.errors)) return d.errors.map((e: any) => e.msg || e.message).join(', ');
    return d?.message || err.message || 'Request failed';
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const res = await api.post('/reset/forgot-password', { email: data.email });
      const payload = res?.data;

      if (payload?.success) {
        // If using Ethereal dev preview, open preview URL for dev inspection
        if (payload?.previewUrl) {
          try { 
            window.open(payload.previewUrl, '_blank'); 
          } catch (e) { 
            console.warn('Could not open preview URL'); 
          }
        }

        alert(payload?.message || 'If an account exists, a reset code was sent to your email.');
        
        // Navigate to reset password verification page with email
        navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
      } else {
        alert(payload?.message || 'Request failed');
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      alert(extractError(err));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-6">
        <div className="mb-4">
          <div className="rounded-full bg-orange-100 w-20 h-20 flex items-center justify-content-center mx-auto mb-4">
            <i className="bi bi-key text-orange-600" style={{ fontSize: '2rem' }}></i>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Forgot your password?</h1>
        <p className="text-sm text-slate-500 mt-1">
          No worries! Enter your email and we'll send you a reset code.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl p-6 md:p-8 ring-1 ring-slate-100">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="form-outline mb-4">
            <Input
              id="forgotEmail"
              type="email"
              placeholder="Enter your email"
              {...register('email', { 
                required: 'Email is required', 
                pattern: { 
                  value: /^\S+@\S+\.\S+$/, 
                  message: 'Enter a valid email address' 
                } 
              })}
              error={errors.email?.message}
            />
            <label className="form-label" htmlFor="forgotEmail">Email Address</label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 mb-4" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Sending reset code...
              </>
            ) : (
              'Send reset code'
            )}
          </button>

          <div className="alert alert-info" role="alert">
            <div className="d-flex">
              <i className="bi bi-info-circle-fill me-2"></i>
              <div>
                <strong>What happens next?</strong>
                <p className="mb-0 small">
                  We'll send a 6-digit verification code to your email. 
                  The code will expire in 10 minutes for security.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm">
              Remember your password? <Link to="/login" className="text-blue-600">Back to login</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}