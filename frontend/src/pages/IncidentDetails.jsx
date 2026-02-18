import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import soundAlert from '../utils/soundAlert';
import Modal from '../components/Modal';

const IncidentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [error, setError] = useState('');
  const [responders, setResponders] = useState([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedResponder, setSelectedResponder] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [showRequestSuccessModal, setShowRequestSuccessModal] = useState(false);

  useEffect(() => {
    fetchIncidentDetails();
    
    // Mark incident as viewed when details page loads (stops sounds and prevents re-alerts)
    if (id) {
      // Use the global function from DashboardLayout
      if (window.markIncidentAsViewed) {
        window.markIncidentAsViewed(id);
      }
      
      // Also mark in localStorage directly as backup
      try {
        if (user?.id) {
          const viewedKey = `viewed_incidents_${user.id}`;
          const viewed = JSON.parse(localStorage.getItem(viewedKey) || '[]');
          if (!viewed.includes(String(id))) {
            viewed.push(String(id));
            localStorage.setItem(viewedKey, JSON.stringify(viewed));
          }
          
          // Stop any playing sounds
          soundAlert.stopAllSounds();
        }
      } catch (e) {
        console.warn('Could not mark incident as viewed:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  useEffect(() => {
    if ((user?.role === 'admin' || user?.role === 'mdrrmo') && incident?.municipality_id) {
      fetchResponders(incident.municipality_id);
    }
  }, [incident?.municipality_id, user?.role]);

  const fetchResponders = async (municipalityId) => {
    if (!municipalityId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone_number')
        .eq('role', 'responder')
        .eq('municipality_id', municipalityId)
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      setResponders(data || []);
    } catch (err) {
      console.error('Error fetching responders:', err);
      setResponders([]);
    }
  };

  const fetchIncidentDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const incidentId = parseInt(id);
      console.log('Fetching incident with ID:', incidentId, 'Type:', typeof incidentId);
      
      const incidentData = await supabaseService.getIncident(incidentId);
      
      if (!incidentData) {
        setError('Incident not found or you do not have permission to view it.');
        setIncident(null);
        return;
      }
      
      console.log('Incident data fetched:', incidentData);
      setIncident(incidentData);

      // Fetch updates
      try {
        const updatesData = await supabaseService.getIncidentUpdates(parseInt(id));
        setUpdates(updatesData || []);
      } catch (err) {
        console.error('Error fetching updates:', err);
        setUpdates([]);
      }

      // Fetch assignments
      if (incidentData?.assignments) {
        setAssignments(incidentData.assignments || []);
      } else {
        setAssignments([]);
      }

      // Fetch responders if MDRRMO/Admin/Municipal Admin
      if ((user?.role === 'admin' || user?.role === 'mdrrmo' || user?.role === 'municipal_admin') && incidentData?.municipality_id) {
        await fetchResponders(incidentData.municipality_id);
      }

      // Fetch media
      try {
        const mediaData = await supabaseService.getIncidentMedia(parseInt(id));
        setMedia(mediaData || []);
      } catch (err) {
        console.error('Error fetching media:', err);
        setMedia([]);
      }
    } catch (err) {
      console.error('Error fetching incident details:', err);
      console.error('Error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      setError(err.message || 'Failed to load incident details. You may not have permission to view this incident.');
      setIncident(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulOperation = async () => {
    try {
      setUpdating(true);
      setError('');
      await supabaseService.updateIncidentStatus(parseInt(id), 'resolved', 'Successful operation - incident resolved.');
      await fetchIncidentDetails();
      alert('Incident marked as resolved (Successful Operation).');
    } catch (err) {
      setError(err.message || 'Failed to mark as resolved');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignResponder = async () => {
    if (!selectedResponder) {
      setError('Please select a responder');
      return;
    }

    try {
      setAssigning(true);
      setError('');
      
      // Create assignment
      const { data: assignment, error: assignError } = await supabase
        .from('assignments')
        .insert({
          incident_id: parseInt(id),
          responder_id: selectedResponder,
          assigned_by: user.id,
          status: 'assigned',
          notes: assignmentNotes || null,
        })
        .select('*, responder:users!assignments_responder_id_fkey(*)')
        .single();

      if (assignError) throw assignError;

      // Update incident status if still "reported"
      if (incident.status === 'reported') {
        await supabase
          .from('incidents')
          .update({ status: 'assigned' })
          .eq('id', parseInt(id));
      }

      // Create update log
      const responderName = assignment.responder?.full_name || 'Responder';
      await supabase
        .from('incident_updates')
        .insert({
          incident_id: parseInt(id),
          updated_by: user.id,
          update_message: `${responderName} assigned to this incident${assignmentNotes ? ': ' + assignmentNotes : ''}`,
          new_status: 'assigned',
        });

      // Create notification for responder
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedResponder,
          incident_id: parseInt(id),
          notification_type: 'incident_assigned',
          title: 'New Incident Assignment',
          message: `You have been assigned to incident: ${incident.title}`,
        });

      await fetchIncidentDetails(); // Refresh data
      setSelectedResponder('');
      setAssignmentNotes('');
      setShowAssignForm(false);
      alert('Responder assigned successfully!');
    } catch (err) {
      setError(err.message || 'Failed to assign responder');
    } finally {
      setAssigning(false);
    }
  };

  const handleRequestAssistance = async () => {
    if (!updateMessage.trim()) {
      setError('Please provide a reason for requesting assistance');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      
      // Call the escalation function (updated parameter name)
      const { error: rpcError } = await supabase.rpc('request_municipal_assistance', {
        p_incident_id: parseInt(id),
        p_escalated_by: user.id,
        p_reason: updateMessage.trim()
      });

      if (rpcError) {
        console.error('Request assistance RPC error:', rpcError);
        throw rpcError;
      }

      await fetchIncidentDetails(); // Refresh data
      setUpdateMessage('');
      setShowRequestSuccessModal(true);
    } catch (err) {
      console.error('Request assistance failed:', err);
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

  const canMarkSuccessfulOperation = () => {
    return ['mdrrmo', 'municipal_admin', 'admin'].includes(user?.role);
  };

  const canRequestAssistance = () => {
    return user?.role === 'barangay_official' && incident?.status !== 'resolved';
  };

  const canAssignResponder = () => {
    return (user?.role === 'admin' || user?.role === 'mdrrmo' || user?.role === 'municipal_admin') && incident?.status !== 'resolved';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading" style={{ padding: '3rem', textAlign: 'center' }}>
          Loading incident details...
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="dashboard-container">
        <div className="incidents-section">
          <h2>Incident Not Found</h2>
          <p>The incident you're looking for doesn't exist or you don't have permission to view it.</p>
          <button onClick={() => navigate('/incidents')} className="btn-primary">
            Back to Incidents
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Emergency Response Platform</h1>
          <div className="user-info">
            <button onClick={() => navigate('/incidents')} className="btn-secondary">
              ← Back to Incidents
            </button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button onClick={() => navigate('/dashboard')} className="nav-btn">
          Dashboard
        </button>
        {/* Report Incident - Only for residents */}
        {user?.role === 'resident' && (
          <button onClick={() => navigate('/incidents/report')} className="nav-btn">
            Report Incident
          </button>
        )}
        <button onClick={() => navigate('/incidents')} className="nav-btn active">
          View Incidents
        </button>
        <button onClick={() => navigate('/notifications')} className="nav-btn">
          Notifications
        </button>
      </nav>

      <main className="dashboard-main">
        <div className="incidents-section">
          {/* Incident Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>{incident.title}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge ${getStatusBadge(incident.status)}`}>
                  {incident.status.replace('_', ' ')}
                </span>
                <span className={`badge ${getUrgencyBadge(incident.urgency_level)}`}>
                  {incident.urgency_level}
                </span>
                <span className="badge badge-default" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{getTypeIcon(incident.incident_type)}</span>
                  {incident.incident_type?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* Incident Information */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
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
              {incident.reporter ? (
                <>
                  <p><strong>Name:</strong> {incident.reporter.full_name || '—'}</p>
                  <p><strong>Email:</strong> {incident.reporter.email || '—'}</p>
                  <p><strong>Phone:</strong> {incident.reporter.phone_number || '—'}</p>
                </>
              ) : incident.reporter_id ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading reporter…</p>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Reporter information not available.</p>
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

          {/* Assignments */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Assigned Responders</h4>
              {canAssignResponder() && (
                <button 
                  onClick={() => setShowAssignForm(!showAssignForm)} 
                  className="btn-secondary"
                  style={{ fontSize: '0.875rem' }}
                >
                  {showAssignForm ? 'Cancel' : '+ Assign Responder'}
                </button>
              )}
            </div>

            {/* Assign Responder Form */}
            {showAssignForm && canAssignResponder() && (
              <div style={{ 
                background: 'var(--bg-glass)', 
                padding: '1.5rem', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: '1rem'
              }}>
                <h5 style={{ marginTop: 0, marginBottom: '1rem' }}>Assign Responder</h5>
                <div className="form-group">
                  <label htmlFor="responder">Select Responder <span className="required">*</span></label>
                  <select
                    id="responder"
                    value={selectedResponder}
                    onChange={(e) => setSelectedResponder(e.target.value)}
                  >
                    <option value="">Select responder</option>
                    {responders
                      .filter(r => !assignments.some(a => a.responder_id === r.id))
                      .map((responder) => (
                        <option key={responder.id} value={responder.id}>
                          {responder.full_name} {responder.phone_number ? `(${responder.phone_number})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="assignmentNotes">Assignment Notes (Optional)</label>
                  <textarea
                    id="assignmentNotes"
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    rows="2"
                    placeholder="Add notes about this assignment..."
                  />
                </div>
                <button 
                  onClick={handleAssignResponder} 
                  disabled={assigning || !selectedResponder}
                  className="btn-primary"
                >
                  {assigning ? 'Assigning...' : 'Assign Responder'}
                </button>
              </div>
            )}

            {assignments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
                No responders assigned yet.
              </p>
            ) : (
              <div className="incidents-list">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="incident-card">
                    <p><strong>Responder:</strong> {assignment.responder?.full_name || 'Unknown'}</p>
                    <p><strong>Status:</strong> {assignment.status}</p>
                    {assignment.notes && <p><strong>Notes:</strong> {assignment.notes}</p>}
                    <p><strong>Assigned:</strong> {new Date(assignment.created_at).toLocaleString()}</p>
                    {assignment.assigned_by && (
                      <p><strong>Assigned by:</strong> {assignment.assigned_by?.full_name || 'System'}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MDRRMO / Municipal: Mark as Successful Operation (Resolved) */}
          {canMarkSuccessfulOperation() && incident.status !== 'resolved' && (
            <div style={{ 
              background: 'rgba(34, 197, 94, 0.1)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              marginBottom: '2rem'
            }}>
              <h4 style={{ marginTop: 0 }}>Successful Operation</h4>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Mark this incident as resolved when the operation is complete.
              </p>
              <button 
                onClick={handleSuccessfulOperation} 
                disabled={updating}
                className="btn-primary"
              >
                {updating ? 'Updating...' : 'Successful Operation'}
              </button>
            </div>
          )}

          {/* Request Assistance Section - Municipal is alerted only when barangay escalates */}
          {canRequestAssistance() && (
            <div style={{ 
              background: 'rgba(223, 41, 53, 0.1)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(223, 41, 53, 0.3)',
              marginBottom: '2rem'
            }}>
              <h4 style={{ marginTop: 0, color: 'var(--scarlet-rush)' }}>🚨 Request Municipal Assistance (Escalate)</h4>
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                Need help from MDRRMO or municipal responders? <strong>Municipal is notified only when you request assistance here</strong>—not when the incident is first reported.
              </p>
              <div className="form-group">
                <label htmlFor="assistanceMessage">Reason for Assistance <span className="required">*</span></label>
                <textarea
                  id="assistanceMessage"
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  rows="3"
                  placeholder="e.g., Suspect has weapon, need police support immediately"
                  required
                />
              </div>
              <button 
                onClick={handleRequestAssistance} 
                disabled={updating || !updateMessage.trim()}
                className="btn-primary"
                style={{ background: 'var(--scarlet-rush)' }}
              >
                {updating ? 'Requesting...' : 'Request Assistance'}
              </button>
            </div>
          )}

          {/* Updates Timeline */}
          <div>
            <h4>Activity Timeline</h4>
            <div className="incidents-list">
              {updates.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>No updates yet.</p>
              ) : (
                updates.map((update) => (
                  <div key={update.id} className="incident-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{update.updated_by?.full_name || update.user?.full_name || 'System'}</strong>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {new Date(update.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ marginBottom: '0.5rem' }}>{update.update_message}</p>
                    {update.previous_status && update.new_status && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Status: {update.previous_status} → {update.new_status}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>

    {/* Success confirmation after Request Assistance */}
    <Modal
      isOpen={showRequestSuccessModal}
      onClose={() => setShowRequestSuccessModal(false)}
      title="Submission sent"
      size="small"
    >
      <div style={{ padding: '0.5rem 0', textAlign: 'center' }}>
        <p style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
          Your request for municipal assistance has been sent successfully. MDRRMO has been notified.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowRequestSuccessModal(false)}
        >
          OK
        </button>
      </div>
    </Modal>
    </>
  );
};

export default IncidentDetails;

