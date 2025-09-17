// src/pages/Signup.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import Input from '../components/Input';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

type RegisterFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function Signup() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormData>();
  const navigate = useNavigate();

  const onSubmit = async (data: RegisterFormData) => {
    try {
      if (data.password !== data.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      const res = await api.post('/auth/signup', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password
      });

      console.log('Signup response:', res?.data);

      if (res?.data?.success) {
        // If using Ethereal dev preview, open preview URL for dev inspection
        if (res?.data?.previewUrl) {
          try { 
            window.open(res.data.previewUrl, '_blank'); 
          } catch (e) { 
            console.warn('Could not open preview URL'); 
          }
        }

        alert(res.data.message || 'Account created! Please check your email for verification code.');
        
        // Navigate to email verification page with email
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } else {
        alert(res?.data?.message || 'Signup failed');
      }
      
    }  catch (err: any) {
  console.error('Signup error:', err);
  if (err?.response) {
    // if server returns previewUrl (ethereal) show it in dev
    if (err.response.data?.previewUrl) {
      console.info('Email preview URL:', err.response.data.previewUrl);
      try { window.open(err.response.data.previewUrl, '_blank'); } catch (e) { /* ignore popup blocked */ }
    }
    alert(err.response.data?.message || 'Signup failed');
  } else {
    alert(err.message || 'Network error');
  }}
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1">Fast, secure signup — start building.</p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl p-6 md:p-8 ring-1 ring-slate-100">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Name input */}
          <div className="form-outline mb-4">
            <Input
              id="registerFirstName"
              placeholder="First name"
              {...register('firstName', {
                required: 'First name required',
                minLength: { value: 2, message: 'Min 2 chars' }
              })}
              error={errors.firstName?.message}
            />
            <label className="form-label" htmlFor="registerFirstName">
              First Name
            </label>
          </div>

          {/* Last Name input */}
          <div className="form-outline mb-4">
            <Input
              id="registerLastName"
              placeholder="Last name"
              {...register('lastName', {
                required: 'Last name required',
                minLength: { value: 2, message: 'Min 2 chars' }
              })}
              error={errors.lastName?.message}
            />
            <label className="form-label" htmlFor="registerLastName">
              Last Name
            </label>
          </div>

          {/* Email input */}
          <div className="form-outline mb-4">
            <Input
              id="registerEmail"
              type="email"
              placeholder="Email"
              {...register('email', {
                required: 'Email required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter valid email' }
              })}
              error={errors.email?.message}
            />
            <label className="form-label" htmlFor="registerEmail">
              Email
            </label>
          </div>

          {/* Password input */}
          <div className="form-outline mb-4">
            <Input
              id="registerPassword"
              type="password"
              placeholder="Password"
              {...register('password', {
                required: 'Password required',
                minLength: { value: 6, message: 'Min 6 chars' },
                pattern: { 
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
                  message: 'Password must contain lowercase, uppercase, and number' 
                }
              })}
              error={errors.password?.message}
            />
            <label className="form-label" htmlFor="registerPassword">
              Password
            </label>
          </div>

          {/* Repeat Password input */}
          <div className="form-outline mb-4">
            <Input
              id="registerRepeatPassword"
              type="password"
              placeholder="Repeat password"
              {...register('confirmPassword', {
                validate: (v) => v === watch('password') || 'Passwords must match'
              })}
              error={errors.confirmPassword?.message}
            />
            <label className="form-label" htmlFor="registerRepeatPassword">
              Repeat password
            </label>
          </div>

          {/* Checkbox */}
          <div className="form-check d-flex justify-content-center mb-4">
            <input
              className="form-check-input me-2"
              type="checkbox"
              id="registerCheck"
              defaultChecked
            />
            <label className="form-check-label" htmlFor="registerCheck">
              I have read and agree to the terms
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-block mb-3"
          >
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </button>

          <div className="text-center">
            <p>Already have an account? <Link to="/login">Login</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}