import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// eslint-disable-next-line no-unused-vars
import { supabase } from '../lib/supabase';

const AccountSetup = () => {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    phone_number: '',
    municipality_id: '',
    barangay_id: '',
    address: '', // Physical address
  });
  const [verificationDocuments, setVerificationDocuments] = useState({
    id_document: null, // Valid ID (Government ID, Driver's License, etc.)
    proof_of_residence: null, // Utility bill, Barangay certificate, etc.
  });
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(true);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let fetchTimeout;
    
    // Check if user is already set up
    // Super admin doesn't need municipality_id, only phone_number
    if (user) {
      const isSuperAdmin = user.role === 'super_admin';
      const hasPhoneNumber = user.phone_number && 
        (typeof user.phone_number === 'string' ? user.phone_number.trim() !== '' : user.phone_number);
      const hasMunicipality = user.municipality_id && 
        (typeof user.municipality_id === 'number' ? user.municipality_id > 0 : 
         typeof user.municipality_id === 'string' ? user.municipality_id.trim() !== '' : false);
      
      // Super admin should be redirected immediately (they don't need setup)
      if (isSuperAdmin) {
        const redirectTimeout = setTimeout(() => {
          if (isMounted) {
            navigate('/dashboard', { replace: true });
          }
        }, 100);
        return () => clearTimeout(redirectTimeout);
      }
      
      // Regular users need both phone_number and municipality_id
      if (hasPhoneNumber && hasMunicipality) {
        // User already completed setup, redirect to dashboard
        // Add a small delay to prevent race conditions
        const redirectTimeout = setTimeout(() => {
          if (isMounted) {
            navigate('/dashboard', { replace: true });
          }
        }, 100);
        return () => clearTimeout(redirectTimeout);
      }
      // Pre-fill form with existing data if available
      if (isMounted) {
        setFormData(prev => ({
          ...prev,
          phone_number: user.phone_number || '',
          municipality_id: user.municipality_id || '',
          barangay_id: user.barangay_id || '',
          address: user.address || '',
        }));
      }
    }
    
    // Only fetch municipalities once, with a small delay to avoid race conditions
    if (isMounted) {
      fetchTimeout = setTimeout(() => {
        if (isMounted) {
          fetchMunicipalities();
        }
      }, 100);
    }
    
    return () => {
      isMounted = false;
      if (fetchTimeout) clearTimeout(fetchTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    let isMounted = true;
    
    if (formData.municipality_id) {
      // Always fetch when municipality changes (deduplication happens in fetchBarangays)
      fetchBarangays(formData.municipality_id).then(() => {
        if (isMounted) {
          // Reset barangay selection when municipality changes
          setFormData(prev => ({ ...prev, barangay_id: '' }));
        }
      });
    } else {
      if (isMounted) {
        setBarangays([]);
        // Clear barangay selection when municipality is cleared
        setFormData(prev => ({ ...prev, barangay_id: '' }));
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [formData.municipality_id]); // Only depend on municipality_id

  const fetchMunicipalities = async () => {
    setLoadingMunicipalities(true);
    setError(''); // Clear previous errors
    
    // Set maximum timeout to ensure loading always resolves
    const maxTimeout = setTimeout(() => {
      console.warn('Municipalities fetch taking too long, forcing completion');
      setLoadingMunicipalities(false);
      if (municipalities.length === 0) {
        setError('Failed to load municipalities. The database may not be seeded. Please check your Supabase setup.');
      }
    }, 8000); // 8 second maximum
    
    try {
      // Simple direct query without Promise.race to avoid abort issues
      const { data, error } = await supabase
        .from('municipalities')
        .select('*')
        .order('name');
      
      clearTimeout(maxTimeout);
      
      if (error) {
        // Handle specific error types
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.warn('Request was aborted');
          setMunicipalities([]);
          setError('Request was cancelled. Please refresh the page.');
          setLoadingMunicipalities(false);
          return;
        }
        
        // Check for RLS policy errors
        if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          setError('Permission denied. Please check your database RLS policies are set up correctly.');
          setMunicipalities([]);
          setLoadingMunicipalities(false);
          return;
        }
        
        throw error;
      }
      
      if (data && Array.isArray(data)) {
        if (data.length > 0) {
          setMunicipalities(data);
          setError('');
        } else {
          setMunicipalities([]);
          setError('No municipalities found. Please run the seed.sql script in your Supabase SQL Editor to populate the database.');
        }
      } else {
        setMunicipalities([]);
        setError('No municipalities found. Please ensure the database has been seeded.');
      }
    } catch (err) {
      clearTimeout(maxTimeout);
      console.error('Error fetching municipalities:', err);
      
      // Provide helpful error messages
      if (err.message?.includes('timeout') || err.message?.includes('Query timeout')) {
        setError('Request timed out. This might mean the database is not accessible or not seeded. Please check your Supabase connection and ensure seed.sql has been run.');
      } else if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        setError('Request was cancelled. Please refresh the page and try again.');
      } else {
        setError(`Failed to load municipalities: ${err.message || 'Unknown error'}. Please check your database connection.`);
      }
      setMunicipalities([]);
    } finally {
      clearTimeout(maxTimeout);
      setLoadingMunicipalities(false);
    }
  };

  const fetchBarangays = async (municipalityId) => {
    if (!municipalityId) {
      setBarangays([]);
      setLoadingBarangays(false);
      return;
    }
    
    setLoadingBarangays(true);
    
    // Set maximum timeout to ensure loading always resolves
    const maxTimeout = setTimeout(() => {
      console.warn('Barangays fetch taking too long, forcing completion');
      setLoadingBarangays(false);
    }, 5000); // 5 second maximum
    
    try {
      // Create query with DISTINCT to prevent duplicates at database level
      const queryPromise = supabase
        .from('barangays')
        .select('id, municipality_id, name, code, created_at, updated_at')
        .eq('municipality_id', municipalityId)
        .order('name', { ascending: true });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      );
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
      clearTimeout(maxTimeout);
      
      if (error) {
        // Handle AbortError specifically
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.warn('Barangay request was aborted');
          setBarangays([]);
          setLoadingBarangays(false);
          return;
        }
        throw error;
      }
      
      // Aggressive deduplication by both id and name+municipality_id combination
      const uniqueBarangays = [];
      const seenIds = new Set();
      const seenNames = new Set();
      
      if (data && Array.isArray(data)) {
        for (const barangay of data) {
          // Create unique key from id and name+municipality_id
          const idKey = barangay.id;
          const nameKey = `${barangay.municipality_id}-${barangay.name?.toLowerCase().trim()}`;
          
          // Only add if both id and name combination are unique
          if (idKey && !seenIds.has(idKey) && !seenNames.has(nameKey)) {
            seenIds.add(idKey);
            seenNames.add(nameKey);
            uniqueBarangays.push(barangay);
          } else {
            console.warn(`Duplicate barangay detected: ID=${idKey}, Name=${barangay.name}, Municipality=${barangay.municipality_id}`);
          }
        }
      }
      
      console.log(`Fetched ${uniqueBarangays.length} unique barangays from ${data?.length || 0} total records`);
      
      // Sort by name to ensure consistent order
      uniqueBarangays.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });
      
      setBarangays(uniqueBarangays);
    } catch (err) {
      clearTimeout(maxTimeout);
      console.error('Error fetching barangays:', err);
      // Don't show error for AbortError or timeout
      if (err.name !== 'AbortError' && !err.message?.includes('aborted') && !err.message?.includes('timeout')) {
        console.error('Failed to load barangays:', err.message);
      }
      setBarangays([]);
    } finally {
      clearTimeout(maxTimeout);
      setLoadingBarangays(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If municipality changes, reset barangay selection
    if (name === 'municipality_id') {
      setFormData({
        ...formData,
        [name]: value,
        barangay_id: '', // Reset barangay when municipality changes
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields for emergency response system
    if (!formData.phone_number || !formData.municipality_id) {
      setError('Phone number and municipality are required for emergency response features.');
      setLoading(false);
      return;
    }

    // Set maximum timeout to ensure loading always resolves
    const maxTimeout = setTimeout(() => {
      console.warn('Update taking too long, forcing completion');
      setLoading(false);
      setError('Request timed out. Please try again.');
    }, 10000); // 10 second maximum for update

    try {
      // Upload verification documents first (for residents)
      let documentPaths = {};
      if (user?.role === 'resident' && verificationDocuments.id_document && verificationDocuments.proof_of_residence) {
        try {
          // Upload ID document
          const idFileExt = verificationDocuments.id_document.name.split('.').pop();
          const idFileName = `${user.id}_id_${Date.now()}.${idFileExt}`;
          const idFilePath = `verification/${idFileName}`;
          
          const { error: idUploadError } = await supabase.storage
            .from('user-documents')
            .upload(idFilePath, verificationDocuments.id_document);
          
          if (idUploadError) throw idUploadError;
          
          // Upload proof of residence
          const proofFileExt = verificationDocuments.proof_of_residence.name.split('.').pop();
          const proofFileName = `${user.id}_proof_${Date.now()}.${proofFileExt}`;
          const proofFilePath = `verification/${proofFileName}`;
          
          const { error: proofUploadError } = await supabase.storage
            .from('user-documents')
            .upload(proofFilePath, verificationDocuments.proof_of_residence);
          
          if (proofUploadError) throw proofUploadError;
          
          documentPaths = {
            id_document: idFilePath,
            proof_of_residence: proofFilePath,
          };
        } catch (docError) {
          console.error('Error uploading documents:', docError);
          setError('Failed to upload verification documents. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Clean and prepare data for update
      const updateData = {
        phone_number: formData.phone_number || null,
        municipality_id: formData.municipality_id ? parseInt(formData.municipality_id, 10) : null,
        barangay_id: formData.barangay_id ? parseInt(formData.barangay_id, 10) : null,
        address: formData.address || null,
        verification_status: user?.role === 'resident' ? 'pending' : null,
        verification_documents: user?.role === 'resident' && Object.keys(documentPaths).length > 0 ? documentPaths : null,
      };

      // Remove null values for optional fields to avoid issues
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null && key !== 'phone_number' && key !== 'municipality_id') {
          delete updateData[key];
        }
      });

      console.log('Updating user with data:', updateData);

      // Update user profile with setup information
      const updatePromise = updateUser(updateData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Update timeout')), 8000)
      );
      
      const updatedUser = await Promise.race([updatePromise, timeoutPromise]);
      
      clearTimeout(maxTimeout);
      
      // Verify the update was successful before redirecting
      if (updatedUser && updatedUser.phone_number && updatedUser.municipality_id) {
        // Force a refresh of the user profile from database to ensure we have latest data
        // This prevents the ProtectedRoute from seeing stale data
        try {
          if (refreshUser) {
            await refreshUser();
          }
        } catch (refreshError) {
          console.warn('Could not refresh user after update:', refreshError);
          // Continue anyway - the updateUser already updated the state
        }
        
        // Small delay to ensure user context is fully updated, then redirect
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 300);
      } else {
        throw new Error('Profile update completed but required fields are missing. Please try again.');
      }
    } catch (err) {
      clearTimeout(maxTimeout);
      console.error('Error updating profile:', err);
      let errorMessage = 'Failed to complete account setup. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error.message || `Database error: ${err.error.code || 'Unknown error'}`;
      }
      
      setError(errorMessage);
    } finally {
      clearTimeout(maxTimeout);
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card register-card-two-col">
        <div className="register-header auth-header">
          <div className="logo-icon">⚙️</div>
          <h2>Complete Your Profile</h2>
          <h3>Finish setting up your account to access all features</h3>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
            {(error.includes('municipalities') || error.includes('seeded') || error.includes('database')) && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', padding: '0.75rem', backgroundColor: 'rgba(4, 70, 167, 0.1)', borderRadius: '8px', border: '1px solid rgba(4, 70, 167, 0.3)' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>📋 Database Setup Required:</strong>
                <p style={{ marginBottom: '0.5rem' }}>If you're setting up the database for the first time, run these SQL scripts in your Supabase SQL Editor (in order):</p>
                <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                  <li><strong>schema.sql</strong> - Creates all tables</li>
                  <li><strong>seed.sql</strong> - Populates municipalities and barangays (5 municipalities, 87+ barangays)</li>
                  <li><strong>policies.sql</strong> - Sets up Row Level Security (RLS) policies</li>
                </ol>
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  After running seed.sql, you should see 5 municipalities in the dropdown.
                </p>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="register-form-two-col">
          <div className="form-columns">
            {/* Left Column - Contact & Location (Required) */}
            <div className="form-column">
              <div className="form-section">
                <h4>Contact & Location <span className="required">*</span></h4>
                <p className="info-text" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                  This information is required for emergency response features and incident reporting.
                </p>
                
                <div className="form-group">
                  <label htmlFor="phone_number">Phone Number <span className="required">*</span></label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="municipality_id">Municipality <span className="required">*</span></label>
                  <select
                    id="municipality_id"
                    name="municipality_id"
                    value={formData.municipality_id}
                    onChange={handleChange}
                    required
                    disabled={loadingMunicipalities}
                  >
                    <option value="">
                      {loadingMunicipalities ? 'Loading municipalities...' : 'Select municipality'}
                    </option>
                    {municipalities.length === 0 && !loadingMunicipalities ? (
                      <option value="" disabled>No municipalities available</option>
                    ) : (
                      municipalities.map((mun) => (
                        <option key={mun.id} value={mun.id}>
                          {mun.name}
                        </option>
                      ))
                    )}
                  </select>
                  {loadingMunicipalities && (
                    <p className="info-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Loading municipalities...
                    </p>
                  )}
                </div>

                <div className="form-group barangay-select-wrapper" style={{ 
                  marginBottom: '1rem', 
                  paddingBottom: '1rem', 
                  position: 'relative', 
                  zIndex: 1
                }}>
                  <label htmlFor="barangay_id">Barangay</label>
                  <div style={{ 
                    position: 'relative', 
                    marginBottom: '0',
                    zIndex: 1
                  }}>
                    <select
                      id="barangay_id"
                      name="barangay_id"
                      value={formData.barangay_id}
                      onChange={handleChange}
                      disabled={!formData.municipality_id || loadingBarangays}
                    >
                      <option value="">
                        {loadingBarangays 
                          ? 'Loading barangays...' 
                          : !formData.municipality_id 
                            ? 'Select municipality first' 
                            : 'Select barangay'}
                      </option>
                      {barangays.length === 0 && formData.municipality_id && !loadingBarangays ? (
                        <option value="" disabled>No barangays found for this municipality</option>
                      ) : (
                        barangays.map((bar) => (
                          <option key={bar.id} value={bar.id}>
                            {bar.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {loadingBarangays && (
                    <p className="info-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Loading barangays...
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="address">Complete Address <span className="required">*</span></label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows="2"
                    placeholder="Street, House Number, etc."
                    style={{ resize: 'vertical' }}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                    Your complete address for emergency response
                  </small>
                </div>
              </div>
            </div>

            {/* Right Column - Verification Documents (For Residents Only) */}
            {user?.role === 'resident' && (
              <div className="form-column">
                <div className="form-section">
                  <h4>Verification Documents <span className="required">*</span></h4>
                  <div style={{ 
                    background: 'rgba(223, 41, 53, 0.1)', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    border: '1px solid rgba(223, 41, 53, 0.3)'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)' }}>
                      <strong>⚠️ Required for Account Verification</strong>
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Documents are required to prevent false reports. Your account will be reviewed by administrators before you can report incidents.
                    </p>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="id_document">Valid ID <span className="required">*</span></label>
                    <input
                      type="file"
                      id="id_document"
                      accept="image/*,.pdf"
                      onChange={(e) => setVerificationDocuments({
                        ...verificationDocuments,
                        id_document: e.target.files[0] || null
                      })}
                      required={user?.role === 'resident'}
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      Government ID, Driver's License, Passport, or National ID
                    </small>
                    {verificationDocuments.id_document && (
                      <p style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        ✓ {verificationDocuments.id_document.name}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="proof_of_residence">Proof of Residence <span className="required">*</span></label>
                    <input
                      type="file"
                      id="proof_of_residence"
                      accept="image/*,.pdf"
                      onChange={(e) => setVerificationDocuments({
                        ...verificationDocuments,
                        proof_of_residence: e.target.files[0] || null
                      })}
                      required={user?.role === 'resident'}
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      Utility bill, Barangay certificate, Lease agreement, or Bank statement
                    </small>
                    {verificationDocuments.proof_of_residence && (
                      <p style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        ✓ {verificationDocuments.proof_of_residence.name}
                      </p>
                    )}
                  </div>

                  <div style={{ 
                    background: 'rgba(4, 70, 167, 0.1)', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    marginTop: '1rem',
                    border: '1px solid rgba(4, 70, 167, 0.3)'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong>📋 Note:</strong> After submission, your account will be reviewed. You'll receive a notification once verified. False reports may result in account suspension and legal action.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-submit-section">
            <button type="submit" disabled={loading} className="btn-primary btn-block">
              {loading ? 'Completing Setup...' : 'Complete Setup'}
            </button>
            {user?.role === 'resident' && (
              <p className="info-text" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                ⚠️ Your account will be reviewed. You'll receive a notification once verified. Until then, you cannot report incidents.
              </p>
            )}
            {user?.role !== 'resident' && (
              <p className="info-text" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
                You can update this information later in your profile settings.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountSetup;

