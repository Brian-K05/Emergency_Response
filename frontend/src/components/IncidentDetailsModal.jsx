import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import soundAlert from '../utils/soundAlert';
import Modal from './Modal';

const IncidentDetailsModal = ({ isOpen, onClose, incidentId, onUpdate }) => {
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [error, setError] = useState('');
  // Removed responder assignment - MDRRMO calls teams directly

  useEffect(() => {
    if (isOpen && incidentId) {
      fetchIncidentDetails();
      
      // Mark incident as viewed when modal opens (stops sounds and prevents re-alerts)
      if (window.markIncidentAsViewed) {
        window.markIncidentAsViewed(incidentId);
      }
      
      // Also mark in localStorage directly as backup
      try {
        if (user?.id) {
          const viewedKey = `viewed_incidents_${user.id}`;
          const viewed = JSON.parse(localStorage.getItem(viewedKey) || '[]');
          if (!viewed.includes(String(incidentId))) {
            viewed.push(String(incidentId));
            localStorage.setItem(viewedKey, JSON.stringify(viewed));
          }
          
          // Stop any playing sounds
          soundAlert.stopAllSounds();
          
          // Mark all notifications for this incident as read
          supabaseService.markIncidentNotificationsAsRead(incidentId).catch(err => {
            console.warn('Could not mark incident notifications as read:', err);
          });
        }
      } catch (e) {
        console.warn('Could not mark incident as viewed:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, incidentId, user?.id]);

  // Removed responder fetching - MDRRMO calls teams directly

  const fetchIncidentDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const incidentData = await supabaseService.getIncident(incidentId);
      
      if (!incidentData) {
        setError('Incident not found or you do not have permission to view it.');
        setIncident(null);
        return;
      }
      
      setIncident(incidentData);

      // Fetch updates
      try {
        const { data: updatesData, error: updatesError } = await supabase
          .from('incident_updates')
          .select('*, updated_by:users(id, full_name)')
          .eq('incident_id', incidentId)
          .order('created_at', { ascending: false });
        
        if (!updatesError) {
          setUpdates(updatesData || []);
        }
      } catch (e) {
        console.warn('Could not fetch updates:', e);
      }

      // Fetch assignments
      try {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*, team:response_teams(id, name, monitor_user_id), monitor:users!monitor_user_id(id, full_name)')
          .eq('incident_id', incidentId);
        
        if (!assignmentsError) {
          setAssignments(assignmentsData || []);
        }
      } catch (e) {
        console.warn('Could not fetch assignments:', e);
      }

      // Fetch media
      try {
        const { data: mediaData, error: mediaError } = await supabase
          .from('incident_media')
          .select('*')
          .eq('incident_id', incidentId);
        
        if (!mediaError) {
          setMedia(mediaData || []);
        }
      } catch (e) {
        console.warn('Could not fetch media:', e);
      }
    } catch (err) {
      console.error('Error fetching incident details:', err);
      setError(err.message || 'Failed to load incident details');
      setIncident(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      setError('Please select a status');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      
      await supabaseService.updateIncidentStatus(incidentId, newStatus, updateMessage);
      
      await fetchIncidentDetails(); // Refresh data
      setUpdateMessage('');
      setNewStatus('');
      if (onUpdate) onUpdate(); // Notify parent to refresh
      alert('Status updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Removed handleAssignResponder - MDRRMO calls teams directly, no individual responder accounts

  const handleRequestAssistance = async () => {
    if (!updateMessage.trim()) {
      setError('Please provide a reason for requesting assistance');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      
      const { error: rpcError } = await supabase.rpc('request_municipal_assistance', {
        p_incident_id: incidentId,
        p_escalated_by: user.id,
        p_reason: updateMessage
      });

      if (rpcError) throw rpcError;

      await fetchIncidentDetails(); // Refresh data
      setUpdateMessage('');
      if (onUpdate) onUpdate(); // Notify parent to refresh
      alert('Assistance requested! MDRRMO has been notified and will coordinate with response teams.');
    } catch (err) {
      setError(err.message || 'Failed to request assistance');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      reported: 'badge-reported',
      assigned: 'badge-assigned',
      in_progress: 'badge-in-progress',
      resolved: 'badge-resolved',
      cancelled: 'badge-cancelled',
    };
    return statusClasses[status] || 'badge-default';
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyClasses = {
      low: 'badge-low',
      medium: 'badge-medium',
      high: 'badge-high',
      critical: 'badge-critical',
    };
    return urgencyClasses[urgency] || 'badge-medium';
  };

  const getTypeIcon = (type) => {
    const icons = {
      fire: '🔥',
      medical: '🏥',
      accident: '🚗',
      natural_disaster: '🌊',
      crime: '🚨',
      other: '⚠️',
    };
    return icons[type] || '⚠️';
  };

  const canUpdateStatus = () => {
    return ['barangay_official', 'mdrrmo', 'admin', 'municipal_admin'].includes(user?.role);
  };

  const canRequestAssistance = () => {
    return user?.role === 'barangay_official' && incident?.status !== 'resolved';
  };

  // Removed canAssignResponder - MDRRMO calls teams directly, no individual responder accounts

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={incident ? incident.title : 'Incident Details'}
      size="large"
    >
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p>Loading incident details...</p>
        </div>
      ) : !incident ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>The incident you're looking for doesn't exist or you don't have permission to view it.</p>
        </div>
      ) : (
        <div>
          {/* Incident Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>{getTypeIcon(incident.incident_type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`badge ${getStatusBadge(incident.status)}`}>
                    {incident.status.replace('_', ' ')}
                  </span>
                  <span className={`badge ${getUrgencyBadge(incident.urgency_level)}`}>
                    {incident.urgency_level}
                  </span>
                  <span className="badge badge-default">
                    {incident.incident_type?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* Incident Information */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '2rem' 
          }}>
            <div className="info-card" style={{ 
              background: 'var(--bg-glass)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Incident Details</h4>
              <p><strong>Description:</strong></p>
              <p style={{ marginBottom: '1rem' }}>{incident.description}</p>
              <p><strong>Location:</strong> {incident.location_address}</p>
              {incident.barangay && <p><strong>Barangay:</strong> {incident.barangay.name}</p>}
              {incident.municipality && <p><strong>Municipality:</strong> {incident.municipality.name}</p>}
              <p><strong>Coordinates:</strong> {incident.latitude}, {incident.longitude}</p>
              <p><strong>Contact:</strong> {incident.contact_number || 'N/A'}</p>
              <p><strong>Reported:</strong> {new Date(incident.created_at).toLocaleString()}</p>
              {incident.resolved_at && (
                <p><strong>Resolved:</strong> {new Date(incident.resolved_at).toLocaleString()}</p>
              )}
            </div>

            <div className="info-card" style={{ 
              background: 'var(--bg-glass)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Reporter Information</h4>
              {incident.reporter && (
                <>
                  <p><strong>Name:</strong> {incident.reporter.full_name}</p>
                  <p><strong>Email:</strong> {incident.reporter.email}</p>
                  {incident.reporter.phone_number && (
                    <p><strong>Phone:</strong> {incident.reporter.phone_number}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Media Gallery */}
          {media.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h4>Media</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {media.map((item) => (
                  <div key={item.id} style={{ 
                    background: 'var(--bg-glass)', 
                    padding: '0.5rem', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {item.file_type === 'image' ? (
                      <img 
                        src={supabase.storage.from('incident-media').getPublicUrl(item.file_path || '').data.publicUrl}
                        alt={item.file_name}
                        style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
                        onError={(e) => {
                          console.error('Failed to load image:', item.file_path);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <video 
                        src={supabase.storage.from('incident-media').getPublicUrl(item.file_path || '').data.publicUrl}
                        controls
                        style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
                        onError={(e) => {
                          console.error('Failed to load video:', item.file_path);
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Assignments */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Assigned Teams</h4>
            {assignments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
                No teams assigned yet. MDRRMO will coordinate with response teams directly.
              </p>
            ) : (
              <div className="incidents-list">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="incident-card">
                    <p><strong>Team:</strong> {assignment.team?.name || 'Unknown Team'}</p>
                    {assignment.monitor && <p><strong>Team Monitor:</strong> {assignment.monitor.full_name}</p>}
                    <p><strong>Status:</strong> {assignment.status}</p>
                    {assignment.notes && <p><strong>Notes:</strong> {assignment.notes}</p>}
                    <p><strong>Assigned:</strong> {new Date(assignment.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Update Section */}
          {canUpdateStatus() && incident.status !== 'resolved' && (
            <div style={{ 
              background: 'var(--bg-glass)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '2rem'
            }}>
              <h4 style={{ marginTop: 0 }}>Update Status</h4>
              <div className="form-group">
                <label htmlFor="newStatus">New Status</label>
                <select
                  id="newStatus"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">Select status</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="updateMessage">Update Message (Optional)</label>
                <textarea
                  id="updateMessage"
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  rows="3"
                  placeholder="Add notes about this update..."
                />
              </div>
              <button 
                onClick={handleStatusUpdate} 
                disabled={updating || !newStatus}
                className="btn-primary"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          )}

          {/* Request Assistance Section */}
          {canRequestAssistance() && (
            <div style={{ 
              background: 'rgba(223, 41, 53, 0.1)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(223, 41, 53, 0.3)',
              marginBottom: '2rem'
            }}>
              <h4 style={{ marginTop: 0 }}>Request Municipal Assistance</h4>
              <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                Request help from MDRRMO if you need additional support. MDRRMO will coordinate with response teams directly.
              </p>
              <div className="form-group">
                <label htmlFor="assistanceReason">Reason for Assistance <span className="required">*</span></label>
                <textarea
                  id="assistanceReason"
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  rows="3"
                  placeholder="Explain why you need assistance..."
                  required
                />
              </div>
              <button 
                onClick={handleRequestAssistance} 
                disabled={updating || !updateMessage.trim()}
                className="btn-primary"
                style={{ background: 'var(--error)' }}
              >
                {updating ? 'Requesting...' : 'Request Assistance'}
              </button>
            </div>
          )}

          {/* Updates Timeline */}
          {updates.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h4>Update History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {updates.map((update) => (
                  <div key={update.id} style={{ 
                    background: 'var(--bg-glass)', 
                    padding: '1rem', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    borderLeft: '4px solid var(--primary)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{update.updated_by?.full_name || 'System'}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {new Date(update.created_at).toLocaleString()}
                      </span>
                    </div>
                    {update.update_message && (
                      <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>
                        {update.update_message}
                      </p>
                    )}
                    {update.new_status && (
                      <span className={`badge ${getStatusBadge(update.new_status)}`} style={{ fontSize: '0.75rem' }}>
                        Status: {update.new_status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default IncidentDetailsModal;

