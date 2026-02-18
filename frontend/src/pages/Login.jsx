import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated (super_admin never needs account setup)
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === 'super_admin') {
        navigate('/dashboard', { replace: true });
      } else if (user?.phone_number && user?.municipality_id) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/account/setup', { replace: true });
      }
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      const user = result?.user;
      // Super admin goes straight to dashboard; others need complete profile
      if (user?.role === 'super_admin') {
        navigate('/dashboard', { replace: true });
      } else if (user && user.phone_number && user.municipality_id) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/account/setup', { replace: true });
      }
    } catch (err) {
      let errorMessage = err.message || 'Login failed. Please check your credentials.';
      
      // Handle specific error types
      if (err.message?.includes('Invalid email or password')) {
        errorMessage = err.message;
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = err.message;
      } else if (err.message?.includes('rate limit')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(4, 70, 167, 0.2)',
          borderTopColor: '#0446A7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <Link to="/" className="auth-back-link">← Back to home</Link>
        <div className="auth-header">
          <div className="logo-icon">🚨</div>
          <h2>Emergency Response</h2>
          <h3>Welcome back. Sign in to continue.</h3>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">
              <span className="label-icon">✉</span> Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <span className="label-icon">🔒</span> Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <span>
                <span className="spinner"></span> Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="register-link">
          Don't have an account? <Link to="/register">Create one now</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

