import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../lib/supabase';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    full_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if (!formData.username || !formData.email || !formData.password || !formData.full_name) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      // Create account with only basic info - role is always 'resident' for public registration
      const registrationData = {
        ...formData,
        role: 'resident' // Always set to resident for public registration
      };
      await signUp(registrationData.email, registrationData.password, registrationData);
      // Redirect to account setup instead of dashboard
      navigate('/account/setup');
    } catch (err) {
      let errorMessage = err.message || 'Registration failed. Please try again.';
      
      // Handle specific error types
      if (err.status === 429 || err.name === 'RateLimitError' || err.message?.includes('rate limit')) {
        errorMessage = 'Too many registration attempts. Please wait 5-10 minutes before trying again. This helps prevent spam and protects our system.';
      } else if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        errorMessage = 'An account with this email or username already exists. Please try logging in instead.';
      } else if (err.message?.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (err.message?.includes('password')) {
        errorMessage = 'Password does not meet requirements. Please ensure it is at least 8 characters long.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card register-card-two-col">
        <div className="register-header auth-header">
          <div className="logo-icon">🚨</div>
          <h2>Join Emergency Response</h2>
          <h3>Create your account to get started</h3>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="register-form-two-col">
          <div className="form-columns">
            {/* Left Column - Basic Information */}
            <div className="form-column">
              <div className="form-section">
                <h4>Basic Information</h4>
                
                <div className="form-group">
                  <label htmlFor="username">Username <span className="required">*</span></label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Choose a username"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email <span className="required">*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="password">Password <span className="required">*</span></label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password_confirmation">Confirm Password <span className="required">*</span></label>
                    <input
                      type="password"
                      id="password_confirmation"
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      onChange={handleChange}
                      required
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="full_name">Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Account Type Information */}
            <div className="form-column">
              <div className="form-section">
                <div className="info-box">
                  <h4>Account Type</h4>
                  <p className="info-text">
                    All public registrations are automatically set as <strong>Community Resident</strong>. 
                    This allows you to report emergencies and receive alerts in your area.
                  </p>
                  <p className="info-text" style={{ marginTop: '0.75rem' }}>
                    <strong>For Emergency Responders, Barangay Officials, MDRRMO Staff, or Administrators:</strong><br />
                    Please contact your system administrator to create your account with the appropriate role. 
                    You must provide proper identification and authorization documents.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="form-submit-section">
            <button type="submit" disabled={loading} className="btn-primary btn-block">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            <p className="login-link">
              Already have an account? <Link to="/login">Sign in here</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
