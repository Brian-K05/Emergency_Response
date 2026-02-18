import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../services/supabaseService';

const IncidentReport = ({ onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    incident_type: '',
    description: '', // Brief description only
    street_address: '', // Only street name/details (barangay and municipality auto-filled)
    latitude: null, // Optional - GPS may not work without internet
    longitude: null, // Optional - GPS may not work without internet
    barangay_id: user?.barangay_id || '',
    municipality_id: user?.municipality_id || '',
    urgency_level: 'high', // Default to high for faster response
    contact_number: user?.phone_number || '',
  });
  const [, setMunicipalities] = useState([]);
  const [, setBarangays] = useState([]);
  const [userBarangay, setUserBarangay] = useState(null);
  const [userMunicipality, setUserMunicipality] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchMunicipalities();
    // Automatically try to get GPS location (GPS works without internet/data)
    // GPS uses satellite signals, not mobile data
    getCurrentLocation();
    
    // Pre-fill municipality and barangay from user profile
    if (user) {
      setFormData(prev => ({
        ...prev,
        municipality_id: user.municipality_id || prev.municipality_id,
        barangay_id: user.barangay_id || prev.barangay_id,
        contact_number: user.phone_number || prev.contact_number,
      }));
      
      // Fetch barangay and municipality names for display
      if (user.barangay_id) {
        fetchBarangayName(user.barangay_id);
      }
      if (user.municipality_id) {
        fetchMunicipalityName(user.municipality_id);
      }
    }
  }, [user]);

  useEffect(() => {
    if (formData.municipality_id) {
      fetchBarangays(formData.municipality_id);
    } else {
      setBarangays([]);
    }
  }, [formData.municipality_id]);

  const fetchMunicipalities = async () => {
    try {
      const data = await supabaseService.getMunicipalities();
      setMunicipalities(data);
    } catch (err) {
      console.error('Error fetching municipalities:', err);
    }
  };

  const fetchBarangays = async (municipalityId) => {
    try {
      const data = await supabaseService.getBarangays(municipalityId);
      setBarangays(data);
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };

  const fetchBarangayName = async (barangayId) => {
    try {
      const { data, error } = await supabase
        .from('barangays')
        .select('name')
        .eq('id', barangayId)
        .single();
      if (!error && data) {
        setUserBarangay(data.name);
      }
    } catch (err) {
      console.error('Error fetching barangay name:', err);
    }
  };

  const fetchMunicipalityName = async (municipalityId) => {
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('name')
        .eq('id', municipalityId)
        .single();
      if (!error && data) {
        setUserMunicipality(data.name);
      }
    } catch (err) {
      console.error('Error fetching municipality name:', err);
    }
  };

  const getCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by your device. You can still submit — we\'ll use your barangay area.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationError('');
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        const message = error.code === 1
          ? 'Location access denied. Tap "Allow" when your browser asks, or submit anyway — we\'ll use your barangay.'
          : error.code === 3
            ? 'Location timed out. Check that GPS/Location is on and try again, or submit anyway.'
            : 'Could not get GPS. You can still submit — we\'ll use your barangay area.';
        setLocationError(message);
      },
      {
        timeout: 15000,
        enableHighAccuracy: true,
        maximumAge: 60000
      }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      setError('Maximum 3 photos allowed');
      return;
    }
    setMediaFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.incident_type || !formData.description) {
      setError('Please select emergency type and provide brief description.');
      setLoading(false);
      return;
    }

    // DB requires latitude/longitude NOT NULL — use GPS if we have it, otherwise fallback (0,0) so submit succeeds
    const lat = formData.latitude != null ? parseFloat(formData.latitude) : 0;
    const lng = formData.longitude != null ? parseFloat(formData.longitude) : 0;
    
    // Build full address from street + barangay + municipality
    const fullAddress = [
      formData.street_address,
      userBarangay,
      userMunicipality
    ].filter(Boolean).join(', ');
    
    const title = `${formData.incident_type.charAt(0).toUpperCase() + formData.incident_type.slice(1)} Emergency${formData.street_address ? ' at ' + formData.street_address : ''}`;
    const addressForDb = (lat === 0 && lng === 0)
      ? (fullAddress || `${userBarangay || 'Unknown'}, ${userMunicipality || 'Unknown'}`) + ' (GPS not available)'
      : (fullAddress || `${userBarangay || 'Unknown'}, ${userMunicipality || 'Unknown'}`);

    try {
      // Ensure barangay_id and municipality_id are numbers or null (not empty strings)
      // Use user's barangay_id/municipality_id as fallback if form data is empty
      const barangayId = formData.barangay_id 
        ? (typeof formData.barangay_id === 'string' && formData.barangay_id.trim() !== '' 
           ? parseInt(formData.barangay_id, 10) 
           : formData.barangay_id) 
        : (user?.barangay_id || null);
      
      const municipalityId = formData.municipality_id 
        ? (typeof formData.municipality_id === 'string' && formData.municipality_id.trim() !== '' 
           ? parseInt(formData.municipality_id, 10) 
           : formData.municipality_id) 
        : (user?.municipality_id || null);

      const incidentData = {
        incident_type: formData.incident_type,
        title: title, // Auto-generated
        description: formData.description,
        location_address: addressForDb,
        latitude: lat,
        longitude: lng,
        barangay_id: barangayId,
        municipality_id: municipalityId,
        urgency_level: formData.urgency_level,
        contact_number: formData.contact_number || user?.phone_number || null,
        mediaFiles: mediaFiles,
      };

      await supabaseService.createIncident(incidentData);
      
      // Reset form (keep barangay/municipality from user profile)
      setFormData({
        incident_type: '',
        description: '',
        street_address: '',
        latitude: null,
        longitude: null,
        barangay_id: user?.barangay_id || '',
        municipality_id: user?.municipality_id || '',
        urgency_level: 'high',
        contact_number: user?.phone_number || '',
      });
      setMediaFiles([]);
      setError('');
      
      // Call success callback if provided (modal mode), otherwise navigate
      if (onSuccess) {
        onSuccess();
      } else {
        alert('Incident reported successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to report incident. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="incident-report-form">
      {error && <div className="alert alert-error">{error}</div>}
      {locationError && <div className="alert alert-warning">{locationError}</div>}
      
      <form onSubmit={handleSubmit} className="form-modern">
        <div className="form-section-modern">
          <h4>Incident Information</h4>
          
          <div className="form-group-modern">
            <label htmlFor="incident_type">Emergency Type <span className="required">*</span></label>
            <select
              id="incident_type"
              name="incident_type"
              value={formData.incident_type}
              onChange={handleChange}
              required
              className="input-modern"
            >
              <option value="">Select emergency type</option>
              <option value="fire">Fire</option>
              <option value="medical">Medical Emergency</option>
              <option value="accident">Accident</option>
              <option value="natural_disaster">Natural Disaster</option>
              <option value="crime">Crime</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group-modern">
            <label htmlFor="description">What's happening? <span className="required">*</span></label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="3"
              placeholder="Brief description (e.g., 'Fire in building', 'Car accident on main road', 'Medical emergency')"
              className="input-modern"
              maxLength={200}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Keep it brief - {formData.description.length}/200 characters
            </small>
          </div>

          <div className="form-row-modern">
            <div className="form-group-modern">
              <label htmlFor="urgency_level">How urgent? <span className="required">*</span></label>
              <select
                id="urgency_level"
                name="urgency_level"
                value={formData.urgency_level}
                onChange={handleChange}
                required
                className="input-modern"
              >
                <option value="critical">🚨 Critical - Immediate response needed</option>
                <option value="high">⚠️ High - Urgent attention required</option>
                <option value="medium">⚡ Medium - Response needed soon</option>
                <option value="low">ℹ️ Low - Can wait</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section-modern">
          <h4>Location</h4>
          
          {/* Auto-filled Location Info (Read-only) */}
          <div style={{ 
            padding: '1rem', 
            background: 'rgba(4, 70, 167, 0.05)', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            border: '1px solid rgba(4, 70, 167, 0.2)'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <strong>Your Location (Auto-filled):</strong>
            </p>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>
              {userBarangay && userMunicipality 
                ? `${userBarangay}, ${userMunicipality}`
                : user?.barangay_id && user?.municipality_id
                  ? 'Loading location...'
                  : 'Location not set in profile'}
            </p>
          </div>
          
          {/* Street Address Input */}
          <div className="form-group-modern">
            <label htmlFor="street_address">
              Street Address / Landmark <span className="required">*</span>
            </label>
            <input
              type="text"
              id="street_address"
              name="street_address"
              value={formData.street_address}
              onChange={handleChange}
              placeholder="e.g., 'Main Street, near the market', 'House #123, Purok 5', 'Near the school'"
              className="input-modern"
              required
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
              Enter the street name, house number, or nearby landmark. Your barangay and municipality are already set.
            </small>
          </div>

          {/* GPS Location (Auto-detected, Optional) */}
          <div className="form-group-modern">
            <label htmlFor="gps_location">
              GPS Coordinates (Auto-detected)
            </label>
            {formData.latitude && formData.longitude ? (
              <div style={{ 
                padding: '0.75rem', 
                background: 'rgba(34, 197, 94, 0.1)', 
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <small style={{ color: 'var(--success)', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                  ✓ GPS Location Detected
                </small>
                <p style={{ margin: 0, fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text)' }}>
                  {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              </div>
            ) : (
              <div style={{ 
                padding: '0.75rem', 
                background: 'rgba(107, 114, 128, 0.1)', 
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(107, 114, 128, 0.2)'
              }}>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>
                  ℹ️ GPS coordinates will be detected automatically (works without internet/data)
                </small>
              </div>
            )}
            <button 
              type="button" 
              onClick={getCurrentLocation} 
              className="btn-secondary btn-gps-location"
              disabled={locationLoading}
              style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.875rem', minHeight: '44px', touchAction: 'manipulation' }}
            >
              {locationLoading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, marginRight: '0.5rem' }} />
                  Getting location...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', verticalAlign: 'middle', flexShrink: 0 }}>
                    <path d="M12 2v4M12 18v4M4 12H2m20 0h-2M19.07 19.07l-2.83-2.83M6.76 6.76L3.93 3.93m14.14 0l-2.83 2.83M6.76 17.24l-2.83 2.83"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  {formData.latitude != null && formData.longitude != null ? 'Update GPS Location' : 'Get GPS Location'}
                </>
              )}
            </button>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.5rem' }}>
              Tap the button above to use your current location. If it doesn&apos;t work, you can still submit — we&apos;ll use your barangay.
            </small>
          </div>

          {/* Hidden GPS coordinates */}
          <input
            type="hidden"
            id="latitude"
            name="latitude"
            value={formData.latitude || ''}
          />
          <input
            type="hidden"
            id="longitude"
            name="longitude"
            value={formData.longitude || ''}
          />
        </div>

        <div className="form-section-modern">
          <h4>Photos (Optional)</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Add photos to help responders understand the situation better
          </p>
          
          <div className="form-group-modern">
            <label htmlFor="media">Take or upload photos (Max 3 files)</label>
            <div className="file-upload-area">
              <input
                type="file"
                id="media"
                name="media"
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*"
                className="file-input"
              />
              <label htmlFor="media" className="file-label">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Choose files
              </label>
              {mediaFiles.length > 0 && (
                <div className="file-list-modern">
                  <p>{mediaFiles.length} file(s) selected</p>
                  <ul>
                    {mediaFiles.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions-modern">
          <button 
            type="button" 
            onClick={handleCancel} 
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
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncidentReport;
