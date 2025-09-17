import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import VerifyEmail from './pages/VerifyEmail';
import { getToken, clearToken } from './utils/auth';
import api from './api/axios';

function Header() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = getToken();
      setAuthed(Boolean(token));
      
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        delete api.defaults.headers.common['Authorization'];
      }
    };
    
    checkAuth();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        checkAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    clearToken();
    delete api.defaults.headers.common['Authorization'];
    setAuthed(false);
    navigate('/login');
  };

  const NavLinkStyled = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm px-4 py-2 rounded-lg font-medium transition ${
          isActive
            ? 'bg-blue-600 text-white shadow'
            : 'text-slate-200 hover:text-white hover:bg-blue-500'
        }`
      }
      onClick={() => setOpen(false)}
    >
      {children}
    </NavLink>
  );

  return (
   <header className="mb-4">
  <div className="relative d-flex align-items-center justify-content-between gap-3 rounded p-3 shadow-sm bg-gradient header-gradient">
    <div className="d-flex align-items-center gap-3">
      <Link to="/" className="d-flex align-items-center gap-3 text-decoration-none">
        <div className="brand-logo bg-white text-primary d-flex align-items-center justify-content-center shadow-sm">
          <i className="bi bi-shield-lock"></i>
        </div>

        <div className="d-none d-sm-flex flex-column">
          <div className="fw-semibold text-white">Code For Tomorrow </div>
          <div className="brand-subtitle">auth flows • demo</div>
        </div>
      </Link>
    </div>

    <nav className="d-none d-md-flex align-items-center gap-2">
      {!authed && (
        <>
          <NavLinkStyled to="/signup">Signup</NavLinkStyled>
          <NavLinkStyled to="/login">Login</NavLinkStyled>
          <NavLinkStyled to="/forgot-password">Forgot</NavLinkStyled>
        </>
      )}

      {authed && (
        <>
          <NavLinkStyled to="/profile">Profile</NavLinkStyled>
          <button
            onClick={logout}
            className="btn btn-sm btn-outline-light logout-btn"
            aria-label="Logout"
          >
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </>
      )}
    </nav>

    <div className="d-md-none d-flex align-items-center">
      <button
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v: boolean) => !v)}
        className="btn btn-light btn-sm mobile-toggle"
      >
        <i className={open ? "bi bi-x-lg" : "bi bi-list"}></i>
      </button>
    </div>

    {open && (
      <div className="mobile-menu bg-white rounded shadow-lg border p-3 d-md-none">
        <div className="d-flex flex-column gap-2">
          {!authed && (
            <>
              <NavLink to="/signup" className="mobile-nav-link" onClick={() => setOpen(false)}>
                <i className="bi bi-person-plus me-2"></i> Signup
              </NavLink>
              <NavLink to="/login" className="mobile-nav-link" onClick={() => setOpen(false)}>
                <i className="bi bi-box-arrow-in-right me-2"></i> Login
              </NavLink>
              <NavLink to="/forgot-password" className="mobile-nav-link" onClick={() => setOpen(false)}>
                <i className="bi bi-key me-2"></i> Forgot Password
              </NavLink>
            </>
          )}
          {authed && (
            <>
              <NavLink to="/profile" className="mobile-nav-link" onClick={() => setOpen(false)}>
                <i className="bi bi-person me-2"></i> Profile
              </NavLink>
              <button
                className="mobile-nav-link text-danger text-start"
                onClick={() => { setOpen(false); logout(); }}
              >
                <i className="bi bi-box-arrow-right me-2"></i> Logout
              </button>
            </>
          )}
        </div>
      </div>
    )}
  </div>

  <style>{`
    .header-gradient {
      background: linear-gradient(135deg, #73a9ffff 0%, #250060ff 100%) !important;
    }
    
    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      font-size: 1.2rem;
    }
    
    .brand-subtitle {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.8) !important;
    }
    
    .nav-link-custom {
      padding: 0.5rem 1rem !important;
      border-radius: 0.375rem;
      color: #fff !important;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    
    .nav-link-custom:hover, .nav-link-custom.active {
      background-color: rgba(255, 255, 255, 0.15);
      color: #fff !important;
    }
    
    .nav-link-custom.active {
      background-color: rgba(255, 255, 255, 0.25);
      font-weight: 500;
    }
    
    .logout-btn {
      border-width: 1px;
      padding: 0.375rem 0.75rem;
    }
    
    .logout-btn:hover {
      background-color: #dc3545;
      border-color: #dc3545;
    }
    
    .mobile-toggle {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .mobile-menu {
      position: absolute;
      top: 100%;
      right: 1rem;
      width: 220px;
      z-index: 1000;
    }
    
    .mobile-nav-link {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      color: #212529 !important;
      text-decoration: none;
      display: flex;
      align-items: center;
      transition: background-color 0.2s ease;
    }
    
    .mobile-nav-link:hover, .mobile-nav-link.active {
      background-color: #f8f9fa;
      color: #000000ff !important;
    }
    
    .mobile-nav-link.active {
      font-weight: 500;
    }
  `}</style>
</header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <Header />

          <main>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </main>

          <footer className="mt-6 text-center text-xs text-slate-500">
            Built with <span className="text-red-500">♥</span> — keep it simple and secure.
          </footer>
        </div>
      </div>
    </BrowserRouter>
  );
}