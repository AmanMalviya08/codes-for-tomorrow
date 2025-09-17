// src/pages/Profile.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { clearToken } from '../utils/auth';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
  isEmailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const normalizeUser = (raw: any): UserProfile => {
  const id = raw?.id ?? raw?._id ?? '';
  const firstName = raw?.firstName ?? raw?.first_name ?? (raw?.name ? raw.name.split(' ')[0] : '') ?? '';
  const lastName = raw?.lastName ?? raw?.last_name ?? (raw?.name ? raw.name.split(' ').slice(1).join(' ') : '') ?? '';
  const email = raw?.email ?? raw?.user?.email ?? '';
  // IMPORTANT: wrap the || fallbacks in parentheses when mixing with ??
  const fullName = raw?.fullName ?? raw?.full_name ?? ((`${firstName} ${lastName}`).trim() || email || 'User');
  const isEmailVerified = Boolean(raw?.isEmailVerified ?? raw?.emailVerified ?? raw?.verified);
  const createdAt = raw?.createdAt ?? raw?.created_at ?? raw?.created ?? undefined;
  const updatedAt = raw?.updatedAt ?? raw?.updated_at ?? raw?.updated ?? undefined;

  return {
    id,
    firstName,
    lastName,
    email,
    fullName,
    isEmailVerified,
    createdAt,
    updatedAt
  };
};


export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchProfile();

    if ((location.state as any)?.justVerified) {
      alert('Email verified successfully!');
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    const candidates = ['/profile', '/user/profile', '/auth/profile', '/users/me', '/me'];
    setError(null);
    setLoading(true);

    for (const path of candidates) {
      try {
        console.debug('[Profile] trying', path);
        const res = await api.get(path);

        // Accept multiple shapes: { success: true, data: {...} } | { user: {...} } | direct object
        const payload = res?.data?.data ?? res?.data?.user ?? (res?.data?.success ? res.data : res?.data);

        if (!payload || (res?.data?.success && !res?.data?.data && !res?.data?.user && typeof res?.data !== 'object')) {
          // this means shape is not what we expect; throw to catch block to continue trying candidates
          throw new Error(res?.data?.message || 'No profile data in response');
        }

        const normalized = normalizeUser(payload);
        setUser(normalized);
        setLoading(false);
        return; // success — stop trying
      } catch (err: any) {
        const status = err?.response?.status;
        console.warn(`[Profile] ${path} ->`, status ?? err?.message);

        if (status === 401 || status === 403) {
          clearToken();
          navigate('/login');
          return;
        }

        if (status === 404) {
          // try next candidate
          continue;
        }

        // other errors: surface to user
        setError(err?.response?.data?.message || err?.message || 'Failed to load profile');
        setLoading(false);
        return;
      }
    }

    // none of the candidate endpoints worked
    setError('Profile route not found on server. Tried: /profile, /user/profile, /auth/profile, /users/me, /me');
    setLoading(false);
  };

  const handleLogout = () => {
    clearToken();
    try { delete api.defaults.headers.common['Authorization']; } catch {}
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Error:</strong> {error}
          <hr />
          <div className="d-flex gap-2">
            <button className="btn btn-outline-danger btn-sm" onClick={fetchProfile}>
              <i className="bi bi-arrow-clockwise me-1"></i>
              Retry
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="alert alert-warning" role="alert">
          No user data found. Please try logging in again.
        </div>
      </div>
    );
  }

  const safeInitial = (name?: string) => (name && name.length > 0 ? name.charAt(0).toUpperCase() : '');
  const initials =
    safeInitial(user.firstName) ||
    safeInitial(user.lastName) ||
    safeInitial(user.email) ||
    '?';

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* header + UI unchanged */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-0">Profile</h1>
          <p className="text-muted mb-0">Manage your account information</p>
        </div>
        <button className="btn btn-outline-danger" onClick={handleLogout} title="Logout">
          <i className="bi bi-box-arrow-right me-1"></i> Logout
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-3xl p-4 md:p-6 ring-1 ring-slate-100">
        <div className="text-center mb-4">
          <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 w-24 h-24 flex items-center justify-content-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">{initials}</span>
          </div>
          <h2 className="h4 mb-1">{user.fullName || user.email}</h2>
          <p className="text-muted mb-0">{user.email}</p>

          <div className="mt-2">
            {user.isEmailVerified ? (
              <span className="badge bg-success"><i className="bi bi-check-circle-fill me-1"></i>Email Verified</span>
            ) : (
              <span className="badge bg-warning"><i className="bi bi-exclamation-triangle-fill me-1"></i>Email Not Verified</span>
            )}
          </div>
        </div>

        <hr className="my-4" />

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label text-muted small">First Name</label>
            <div className="form-control-plaintext fw-medium">{user.firstName || '-'}</div>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label text-muted small">Last Name</label>
            <div className="form-control-plaintext fw-medium">{user.lastName || '-'}</div>
          </div>

          <div className="col-12 mb-3">
            <label className="form-label text-muted small">Email Address</label>
            <div className="form-control-plaintext fw-medium">
              {user.email}
              {!user.isEmailVerified && (
                <button className="btn btn-link btn-sm p-0 ms-2" onClick={() => navigate(`/verify-email?email=${encodeURIComponent(user.email)}`)}>Verify now</button>
              )}
            </div>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label text-muted small">User ID</label>
            <div className="form-control-plaintext font-monospace small">{user.id || '-'}</div>
          </div>

          {user.createdAt && (
            <div className="col-md-6 mb-3">
              <label className="form-label text-muted small">Member Since</label>
              <div className="form-control-plaintext small">{formatDate(user.createdAt)}</div>
            </div>
          )}
        </div>

        <hr className="my-4" />

        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={() => alert('Edit profile functionality can be implemented here')}>
            <i className="bi bi-pencil me-1"></i> Edit Profile
          </button>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/forgot-password')}>
            <i className="bi bi-key me-1"></i> Change Password
          </button>
          <button className="btn btn-outline-info" onClick={fetchProfile}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>

        <div className="mt-4 p-3 bg-light rounded">
          <div className="d-flex align-items-center">
            <div className="flex-grow-1">
              <h6 className="mb-1">Account Status</h6>
              <small className="text-muted">Your account is active and {user.isEmailVerified ? 'verified' : 'pending email verification'}.</small>
            </div>
            <div className="flex-shrink-0"><span className="badge bg-success">Active</span></div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
