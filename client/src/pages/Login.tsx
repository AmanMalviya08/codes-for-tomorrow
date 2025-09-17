// src/pages/Login.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { saveToken } from '../utils/auth';
import Input from '../components/Input';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

type LoginFormData = {
  email: string;
  password: string;
};

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>();
  const navigate = useNavigate();

  const onSubmit = async (data: LoginFormData) => {
  // snippet for your Login onSubmit catch block (full file not shown)
try {
  const res = await api.post('/auth/login', { email: data.email, password: data.password });
  if (res?.data?.success) {
    const token = res.data.data.token;
    if (token) {
      saveToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      navigate('/profile');
    }
  } else {
    alert(res?.data?.message || 'Login failed');
  }
} catch (err: any) {
  console.error('Login error:', err);
  if (err?.response) {
    // If backend blocks due to email verification
    if (err.response.status === 403 && err.response.data?.requiresVerification) {
      const emailToVerify = err.response.data.email || data.email;
      alert(err.response.data.message || 'Please verify your email before logging in');
      navigate(`/verify-email?email=${encodeURIComponent(emailToVerify)}`);
      return;
    }
    if (err.response.status === 401) {
      alert(err.response.data?.message || 'Invalid credentials');
      return;
    }
    // fallback
    alert(err.response.data?.message || err.message || 'Login failed');
  } else {
    alert(err.message || 'Network error');
  }
}

  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Login to continue to your dashboard.</p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl p-6 md:p-8 ring-1 ring-slate-100">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="form-outline mb-4">
            <Input
              id="loginEmail"
              type="email"
              {...register('email', { 
                required: 'Email required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter valid email' }
              })}
              error={errors.email?.message}
            />
            <label className="form-label" htmlFor="loginEmail">Email or username</label>
          </div>

          <div className="form-outline mb-4">
            <Input
              id="loginPassword"
              type="password"
              {...register('password', { required: 'Password required' })}
              error={errors.password?.message}
            />
            <label className="form-label" htmlFor="loginPassword">Password</label>
          </div>

          <div className="row mb-4">
            <div className="col-md-6 d-flex justify-content-center">
              <div className="form-check mb-3 mb-md-0">
                <input className="form-check-input" type="checkbox" id="loginCheck" defaultChecked />
                <label className="form-check-label" htmlFor="loginCheck">Remember me</label>
              </div>
            </div>

            <div className="col-md-6 d-flex justify-content-center">
              <button type="button" className="btn btn-link p-0" onClick={() => navigate('/forgot-password')}>
                Forgot password?
              </button>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-100 mb-4">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="text-center">
            <p>Not a member? <Link to="/signup">Register</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}