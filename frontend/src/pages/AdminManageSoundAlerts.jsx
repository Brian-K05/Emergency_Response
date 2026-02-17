import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { soundAlertsService } from '../services/soundAlertsService';
import DashboardLayout from '../components/DashboardLayout';
import soundAlert from '../utils/soundAlert';

const AdminManageSoundAlerts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [soundAlerts, setSoundAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/dashboard');
      return;
    }
    fetchSoundAlerts();
  }, [user]);

  const fetchSoundAlerts = async () => {
    try {
      setLoading(true);
      const data = await soundAlertsService.getSoundAlerts();
      setSoundAlerts(data || []);
    } catch (err) {
      console.error('Error fetching sound alerts:', err);
      setError('Failed to load sound alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (alertType, file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload MP3, WAV, OGG, or M4A files.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    try {
      setUploading({ ...uploading, [alertType]: true });
      setError('');
      setSuccess('');

      await soundAlertsService.uploadSoundAlert(alertType, file);
      
      setSuccess(`Sound alert for ${alertType} uploaded successfully!`);
      await fetchSoundAlerts();
      
      // Refresh sound alert configurations
      await soundAlert.refreshConfigs();
    } catch (err) {
      console.error('Error uploading sound:', err);
      setError(err.message || 'Failed to upload sound file');
    } finally {
      setUploading({ ...uploading, [alertType]: false });
    }
  };

  const handleVolumeChange = async (alertType, volume) => {
    try {
      await soundAlertsService.updateSoundAlert(alertType, { volume: parseFloat(volume) });
      await fetchSoundAlerts();
      await soundAlert.refreshConfigs();
      setSuccess('Volume updated successfully!');
    } catch (err) {
      console.error('Error updating volume:', err);
      setError('Failed to update volume');
    }
  };

  const handleTestSound = async (alertType) => {
    try {
      soundAlert.resume();
      
      if (alertType === 'emergency') {
        soundAlert.playEmergencyAlert();
      } else if (alertType === 'assignment') {
        soundAlert.playAssignmentAlert();
      } else if (alertType === 'escalation') {
        soundAlert.playEscalationAlert();
      }
    } catch (err) {
      console.error('Error testing sound:', err);
      setError('Failed to play test sound');
    }
  };

  const handleDeleteSound = async (alertType) => {
    if (!window.confirm(`Are you sure you want to delete the custom sound for ${alertType}? This will revert to the default generated sound.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await soundAlertsService.deleteSoundAlert(alertType);
      setSuccess(`Custom sound for ${alertType} deleted. System will now use default generated sound.`);
      await fetchSoundAlerts();
      await soundAlert.refreshConfigs();
    } catch (err) {
      console.error('Error deleting sound:', err);
      setError('Failed to delete sound');
    }
  };

  const getAlertTypeLabel = (type) => {
    const labels = {
      emergency: 'Emergency Alert',
      assignment: 'Assignment Alert',
      escalation: 'Escalation Alert'
    };
    return labels[type] || type;
  };

  const getAlertTypeDescription = (type) => {
    const descriptions = {
      emergency: 'Plays when a new incident is reported',
      assignment: 'Plays when a team is assigned to an incident',
      escalation: 'Plays when barangay requests municipal assistance'
    };
    return descriptions[type] || '';
  };

  if (user?.role !== 'super_admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="section-modern">
        <div className="section-header">
          <h2>Manage Sound Alerts</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Upload custom sound files for different alert types. Supported formats: MP3, WAV, OGG, M4A (max 5MB)
          </p>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            padding: '1rem', 
            background: 'rgba(76, 175, 80, 0.1)', 
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#4caf50',
            marginBottom: '1rem'
          }}>
            {success}
          </div>
        )}

        {loading ? (
          <div className="loading" style={{ padding: '3rem', textAlign: 'center' }}>
            Loading sound alerts...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {['emergency', 'assignment', 'escalation'].map((alertType) => {
              const config = soundAlerts.find(s => s.alert_type === alertType);
              const hasCustomSound = config && config.sound_file_path && config.sound_file_path !== 'default';
              const soundUrl = hasCustomSound ? soundAlertsService.getSoundUrl(config.sound_file_path) : null;

              return (
                <div
                  key={alertType}
                  className="info-card"
                  style={{
                    background: 'var(--bg-glass)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>
                        {getAlertTypeLabel(alertType)}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
                        {getAlertTypeDescription(alertType)}
                      </p>
                    </div>
                    {hasCustomSound && (
                      <span className="badge badge-assigned" style={{ fontSize: '0.75rem' }}>
                        Custom Sound
                      </span>
                    )}
                  </div>

                  {/* Current Sound */}
                  {hasCustomSound && soundUrl && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        Current Sound:
                      </p>
                      <audio controls style={{ width: '100%', height: '32px' }}>
                        <source src={soundUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {config.sound_file_name}
                      </p>
                    </div>
                  )}

                  {/* Upload New Sound */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor={`file-${alertType}`} className="btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
                      {hasCustomSound ? 'Replace Sound File' : 'Upload Sound File'}
                      <input
                        id={`file-${alertType}`}
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleFileUpload(alertType, e.target.files[0]);
                          }
                        }}
                        style={{ display: 'none' }}
                        disabled={uploading[alertType]}
                      />
                    </label>
                    {uploading[alertType] && (
                      <span style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>
                        Uploading...
                      </span>
                    )}
                  </div>

                  {/* Volume Control */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor={`volume-${alertType}`} style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      Volume: {config ? Math.round(config.volume * 100) : 70}%
                    </label>
                    <input
                      id={`volume-${alertType}`}
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config?.volume || 0.7}
                      onChange={(e) => handleVolumeChange(alertType, e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleTestSound(alertType)}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                    >
                      🔊 Test Sound
                    </button>
                    {hasCustomSound && (
                      <button
                        onClick={() => handleDeleteSound(alertType)}
                        className="btn-secondary"
                        style={{ flex: 1, background: 'rgba(244, 67, 54, 0.1)', color: '#f44336', borderColor: 'rgba(244, 67, 54, 0.3)' }}
                      >
                        🗑️ Delete Custom Sound
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: 'var(--bg-glass)', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <h4 style={{ marginTop: 0 }}>ℹ️ Information</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8', color: 'var(--text-muted)' }}>
            <li>Sound files will automatically play when incidents are reported or teams are assigned</li>
            <li>If no custom sound is uploaded, the system will use default generated sounds</li>
            <li>Recommended: Use short audio files (1-3 seconds) for best performance</li>
            <li>Supported formats: MP3, WAV, OGG, M4A</li>
            <li>Maximum file size: 5MB</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminManageSoundAlerts;

