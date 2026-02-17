import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getCreatableRoles } from '../utils/roleUtils';
import DashboardLayout from '../components/DashboardLayout';

const AdminCreateUser = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    full_name: '',
    address: '', // Added address field
    role: 'municipal_admin', // Default to municipal_admin for super admin
    municipality_id: user?.municipality_id || '',
    barangay_id: '',
    phone_number: '',
  });
  const [municipalities, setMunicipalities] = useState([]);
  const [municipalitiesWithAdmins, setMunicipalitiesWithAdmins] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Define role checks early so they can be used throughout
  const isSuperAdmin = user?.role === 'super_admin';
  const isMunicipalAdmin = user?.role === 'municipal_admin';

  // Check if user has permission
  useEffect(() => {
    if (user && !['super_admin', 'municipal_admin', 'admin'].includes(user.role)) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch municipalities and check which ones have admins
  useEffect(() => {
    fetchMunicipalities();
    if (isSuperAdmin) {
      fetchMunicipalitiesWithAdmins();
      // Force role to municipal_admin for super admin
      setFormData(prev => ({ ...prev, role: 'municipal_admin' }));
    }
    // Pre-fill municipality for municipal admin
    if (user?.municipality_id && isMunicipalAdmin) {
      setFormData(prev => ({ ...prev, municipality_id: user.municipality_id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSuperAdmin, isMunicipalAdmin]);

  // Fetch barangays when municipality changes
  useEffect(() => {
    if (formData.municipality_id) {
      fetchBarangays(formData.municipality_id);
    } else {
      setBarangays([]);
    }
  }, [formData.municipality_id]);

  const fetchMunicipalities = async () => {
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('*')
        .order('name');
      if (error) throw error;
      
      // If municipal admin, filter to only their municipality
      if (user?.role === 'municipal_admin' && user?.municipality_id) {
        const filtered = (data || []).filter(m => m.id === user.municipality_id);
        setMunicipalities(filtered);
      } else {
        // Super admin and admin can see all municipalities
        setMunicipalities(data || []);
      }
    } catch (err) {
      console.error('Error fetching municipalities:', err);
    }
  };

  const fetchMunicipalitiesWithAdmins = async () => {
    try {
      // Get all municipalities that already have a municipal_admin
      const { data, error } = await supabase
        .from('users')
        .select('municipality_id')
        .eq('role', 'municipal_admin')
        .not('municipality_id', 'is', null);
      
      if (error) throw error;
      
      const municipalityIds = (data || []).map(u => u.municipality_id).filter(Boolean);
      setMunicipalitiesWithAdmins(municipalityIds);
    } catch (err) {
      console.error('Error fetching municipalities with admins:', err);
    }
  };

  const fetchBarangays = async (municipalityId) => {
    try {
      const { data, error } = await supabase
        .from('barangays')
        .select('*')
        .eq('municipality_id', municipalityId)
        .order('name');
      if (error) throw error;
      setBarangays(data || []);
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate required fields
    // For super admin, full_name is optional but phone_number is required; for others both are required
    const requiredFieldsValid = isSuperAdmin
      ? (formData.username && formData.email && formData.password && formData.role && formData.municipality_id && formData.phone_number)
      : (formData.username && formData.email && formData.password && formData.full_name && formData.role);
    
    if (!requiredFieldsValid) {
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

    // Role validation based on current user's role
    if (isSuperAdmin) {
      // Super admin can ONLY create municipal_admin - force it
      if (formData.role !== 'municipal_admin') {
        // Force role to municipal_admin
        setFormData(prev => ({ ...prev, role: 'municipal_admin' }));
      }
      
      // Check if municipality already has an admin
      if (municipalitiesWithAdmins.includes(parseInt(formData.municipality_id))) {
        setError('This municipality already has a Municipal Administrator. Each municipality can only have one administrator.');
        setLoading(false);
        return;
      }
      
      // Municipality is required for municipal admin
      if (!formData.municipality_id) {
        setError('Municipality is required for Municipal Administrator.');
        setLoading(false);
        return;
      }
    } else if (user?.role === 'municipal_admin') {
      // Municipal admin can only create: resident, barangay_official, mdrrmo
      if (['super_admin', 'municipal_admin', 'admin'].includes(formData.role)) {
        setError('You do not have permission to create admin accounts. Only Super Admin can create admin accounts.');
        setLoading(false);
        return;
      }
      // Municipal admin must assign users to their municipality
      if (!formData.municipality_id || formData.municipality_id !== user.municipality_id) {
        setError('You can only create users for your municipality.');
        setLoading(false);
        return;
      }
    } else if (user?.role === 'admin') {
      // Legacy admin role - can create most roles but not super_admin or municipal_admin
      if (['super_admin', 'municipal_admin'].includes(formData.role)) {
        setError('You do not have permission to create admin accounts. Only Super Admin can create admin accounts.');
        setLoading(false);
        return;
      }
    }

    try {
      // Save current session so we can restore it after signUp (signUp replaces the session with the new user)
      const { data: { session: sessionBeforeCreate } } = await supabase.auth.getSession();
      if (!sessionBeforeCreate) {
        throw new Error('Your session expired. Please log in again.');
      }

      // Create the auth user (this will temporarily switch the session to the new user)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            full_name: formData.full_name,
          },
          email_redirect_to: undefined, // Don't require email confirmation for admin-created users
        }
      });

      if (authError) {
        throw new Error(authError.message || 'Failed to create authentication account');
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Restore the admin's session immediately so we stay logged in as the current user
      await supabase.auth.setSession({
        access_token: sessionBeforeCreate.access_token,
        refresh_token: sessionBeforeCreate.refresh_token,
      });

      // Now create the profile using the admin function
      // For super admin creating municipal admin, use username as fallback for full_name if not provided
      const displayName = formData.full_name || (isSuperAdmin ? formData.username : formData.full_name);
      
      const profileData = {
        username: formData.username,
        email: formData.email,
        full_name: displayName,
        role: formData.role,
        municipality_id: formData.municipality_id ? parseInt(formData.municipality_id) : null,
        barangay_id: formData.barangay_id ? parseInt(formData.barangay_id) : null,
        phone_number: formData.phone_number || null,
        address: formData.address || null,
      };

      // Try using the admin_create_user_profile function
      const { error: profileError } = await supabase.rpc('admin_create_user_profile', {
        new_user_id: authData.user.id,
        user_username: profileData.username,
        user_email: profileData.email,
        user_full_name: profileData.full_name,
        user_role: profileData.role,
        user_municipality_id: profileData.municipality_id,
        user_barangay_id: profileData.barangay_id,
        user_phone_number: profileData.phone_number,
        user_address: profileData.address,
      });

      if (profileError) {
        // If RPC fails, try direct insert (might work if policies allow)
        const { error: directError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            ...profileData,
          })
          .select()
          .single();

        if (directError) {
          throw new Error(profileError.message || directError.message || 'Failed to create user profile');
        }
      }

      setSuccess(`Account created successfully for ${formData.full_name} with role: ${formData.role}`);
      
      // Refresh municipalities with admins if super admin
      if (user?.role === 'super_admin') {
        await fetchMunicipalitiesWithAdmins();
      }
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        full_name: '',
        age: '',
        gender: '',
        civil_status: '',
        educational_attainment: '',
        trainings_seminars_attended: '',
        role: user?.role === 'super_admin' ? 'municipal_admin' : 'resident',
        municipality_id: user?.municipality_id || '',
        barangay_id: '',
        phone_number: '',
      });
    } catch (err) {
      const errorMessage = err.message || 'Failed to create account. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get available roles based on current user's role
  const getAvailableRoles = () => {
    return getCreatableRoles(user?.role);
  };
  
  // Group roles by category for better UI
  const getRolesByCategory = () => {
    const roles = getAvailableRoles();
    const grouped = {};
    roles.forEach(role => {
      const category = role.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(role);
    });
    return grouped;
  };

  // Wait for user to load before checking permissions
  if (!user) {
    return (
      <DashboardLayout>
        <div className="section-modern">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading user information...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check permissions with detailed logging
  if (!['super_admin', 'municipal_admin', 'admin'].includes(user.role)) {
    console.error('Access denied - User role:', user.role, 'Full user object:', user);
    return (
      <DashboardLayout>
        <div className="section-modern">
          <h2>Access Denied</h2>
          <p>You must be an administrator to access this page.</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            Current role: {user.role || 'Not set'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="section-modern">
        <div className="section-header">
          <div>
            <h2>
              {isSuperAdmin 
                ? 'Create Municipal Administrator' 
                : isMunicipalAdmin 
                ? `Create User Account for ${user.municipality?.name || 'Your Municipality'}` 
                : 'Create User Account'}
            </h2>
            <p className="section-subtitle">
              {isSuperAdmin 
                ? 'Create one Municipal Administrator for each municipality. Each municipality can only have one administrator.' 
                : isMunicipalAdmin 
                ? 'Create accounts for residents, barangay officials, and MDRRMO staff' 
                : 'Create accounts for verified personnel'}
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Back to Dashboard
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {isSuperAdmin && municipalitiesWithAdmins.length > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
            <strong>Note:</strong> The following municipalities already have administrators: {
              municipalities
                .filter(m => municipalitiesWithAdmins.includes(m.id))
                .map(m => m.name)
                .join(', ')
            }
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-modern">
          {isSuperAdmin ? (
            // Super Admin Form - Minimal fields only
            <>
              <div className="form-section-modern">
                <h4>Account Information</h4>
                
                <div className="form-group-modern">
                  <label htmlFor="username">Username <span className="required">*</span></label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Choose a username"
                    className="input-modern"
                  />
                </div>

                <div className="form-group-modern">
                  <label htmlFor="email">Email <span className="required">*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email address"
                    className="input-modern"
                  />
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
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
                      className="input-modern"
                    />
                  </div>

                  <div className="form-group-modern">
                    <label htmlFor="password_confirmation">Confirm Password <span className="required">*</span></label>
                    <input
                      type="password"
                      id="password_confirmation"
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      onChange={handleChange}
                      required
                      placeholder="Confirm password"
                      className="input-modern"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section-modern">
                <h4>Municipality Assignment <span className="required">*</span></h4>
                <p className="info-text" style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                  Select the municipality for this administrator. Each municipality can only have one administrator.
                </p>
                
                <div className="form-group-modern">
                  <label htmlFor="municipality_id">Municipality <span className="required">*</span></label>
                  <select
                    id="municipality_id"
                    name="municipality_id"
                    value={formData.municipality_id}
                    onChange={handleChange}
                    required
                    className="input-modern"
                  >
                    <option value="">Select municipality</option>
                    {municipalities.map((mun) => {
                      const hasAdmin = municipalitiesWithAdmins.includes(mun.id);
                      return (
                        <option 
                          key={mun.id} 
                          value={mun.id}
                          disabled={hasAdmin}
                        >
                          {mun.name} {hasAdmin ? '(Already has admin)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Municipalities that already have an administrator are disabled.
                  </p>
                </div>

                <div className="form-group-modern">
                  <label htmlFor="phone_number">Phone Number <span className="required">*</span></label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                    placeholder="Enter phone number (e.g., +639123456789)"
                    className="input-modern"
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Required for emergency response communication
                  </p>
                </div>
              </div>
            </>
          ) : (
            // Municipal Admin Form - Full fields for operational users
            <>
              <div className="form-section-modern">
                <h4>Basic Information</h4>
                
                <div className="form-group-modern">
                  <label htmlFor="username">Username <span className="required">*</span></label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Choose a username"
                    className="input-modern"
                  />
                </div>

                <div className="form-group-modern">
                  <label htmlFor="email">Email <span className="required">*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email address"
                    className="input-modern"
                  />
                </div>

                <div className="form-row-modern">
                  <div className="form-group-modern">
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
                      className="input-modern"
                    />
                  </div>

                  <div className="form-group-modern">
                    <label htmlFor="password_confirmation">Confirm Password <span className="required">*</span></label>
                    <input
                      type="password"
                      id="password_confirmation"
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      onChange={handleChange}
                      required
                      placeholder="Confirm password"
                      className="input-modern"
                    />
                  </div>
                </div>

                <div className="form-group-modern">
                  <label htmlFor="full_name">Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                    className="input-modern"
                  />
                </div>
              </div>

              <div className="form-section-modern">
                <h4>Account Role <span className="required">*</span></h4>
                <p className="info-text" style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                  Select the appropriate role for this user. Each role has specific permissions and responsibilities. See ROLES_AND_RESPONSIBILITIES.md for detailed information.
                </p>
                
                <div className="form-group-modern">
                  <label htmlFor="role">Role <span className="required">*</span></label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="input-modern"
                  >
                    <option value="">-- Select Role --</option>
                    {Object.entries(getRolesByCategory()).map(([category, roles]) => (
                      <optgroup key={category} label={category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                        {roles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {formData.role && (
                    <p className="info-text" style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Category: {getAvailableRoles().find(r => r.value === formData.role)?.category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-section-modern">
                <h4>Location Information</h4>
                
                <div className="form-group-modern">
                  <label htmlFor="municipality_id">Municipality <span className="required">*</span></label>
                  <select
                    id="municipality_id"
                    name="municipality_id"
                    value={formData.municipality_id}
                    onChange={handleChange}
                    required
                    disabled
                    className="input-modern"
                  >
                    <option value={formData.municipality_id}>
                      {municipalities.find(m => m.id === formData.municipality_id)?.name || 'Your Municipality'}
                    </option>
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Users will be assigned to your municipality
                  </p>
                </div>

                <div className="form-group-modern">
                  <label htmlFor="barangay_id">Barangay</label>
                  <select
                    id="barangay_id"
                    name="barangay_id"
                    value={formData.barangay_id}
                    onChange={handleChange}
                    disabled={!formData.municipality_id}
                    className="input-modern"
                  >
                    <option value="">Select barangay (optional)</option>
                    {barangays.map((bar) => (
                      <option key={bar.id} value={bar.id}>
                        {bar.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-modern">
                  <label htmlFor="phone_number">Phone Number</label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className="input-modern"
                  />
                </div>
              </div>

              {/* Address field for all users */}
              <div className="form-group-modern">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Complete address"
                  className="input-modern"
                />
              </div>
            </>
          )}

          <div className="form-actions-modern">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary"
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AdminCreateUser;
