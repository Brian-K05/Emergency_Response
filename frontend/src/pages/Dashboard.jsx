import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import DashboardLayout from '../components/DashboardLayout';
import IncidentDetailsModal from '../components/IncidentDetailsModal';
import DashboardCharts from '../components/DashboardCharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    resolved: 0,
    critical: 0,
  });
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    // Initial fetch (show loading only on first load)
    fetchIncidents(true);
    
    // Real-time subscription for instant updates (faster than polling)
    const subscription = supabaseService.subscribeToIncidents((payload) => {
      // Handle different payload formats (Supabase real-time can vary)
      const eventType = payload.eventType || payload.type;
      const newData = payload.new || payload.record;
      
      if ((eventType === 'INSERT' || eventType === 'insert') && newData) {
        // New incident detected - update display IMMEDIATELY
        console.log('🚨 New incident detected via real-time:', newData);
        
        // Add new incident to the list immediately (optimistic update)
        setIncidents(prevIncidents => {
          // Check if already in list
          if (prevIncidents.some(inc => inc.id === newData.id)) {
            return prevIncidents;
          }
          
          // Add new incident at the top
          const updated = [newData, ...prevIncidents].slice(0, 10);
          console.log('✅ Added new incident to display immediately');
          return updated;
        });
        
        // Update stats immediately
        setStats(prevStats => ({
          total: prevStats.total + 1,
          active: prevStats.active + 1,
          resolved: prevStats.resolved,
          critical: newData.urgency_level === 'critical' ? prevStats.critical + 1 : prevStats.critical,
        }));
        
        // Also do a full refresh to ensure data consistency (but display already updated)
        setTimeout(() => fetchIncidents(false), 500);
      } else if ((eventType === 'UPDATE' || eventType === 'update') && newData) {
        // Incident updated - refresh silently
        console.log('📝 Incident updated via real-time:', newData);
        fetchIncidents(false); // Silent update
      }
    });
    
    // Fast polling every 1 second (same speed as alerts)
    // This ensures we catch new incidents even if real-time subscription has issues
    const interval = setInterval(() => {
      fetchIncidents(false); // Silent background refresh
    }, 1000); // Check every 1 second for fast display updates
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]); // Re-subscribe if user changes

  const fetchIncidents = async (showLoading = false) => {
    try {
      // Only show loading spinner on initial load (first time) - never during background refreshes
      if (showLoading && incidents.length === 0 && loading === false) {
        setLoading(true);
      }
      
      const data = await supabaseService.getIncidents({});
      const limitedData = data.slice(0, 10);
      
      // Always update stats silently (they might have changed)
      setStats({
        total: data.length,
        active: data.filter(i => i.status !== 'resolved' && i.status !== 'cancelled').length,
        resolved: data.filter(i => i.status === 'resolved').length,
        critical: data.filter(i => i.urgency_level === 'critical' && i.status !== 'resolved').length,
      });
      
      // Update incidents list silently - new incidents will smoothly appear
      // Use functional update to avoid stale closure issues
      setIncidents(prevIncidents => {
        // Check if there are actual changes
        const prevIds = new Set(prevIncidents.map(i => i.id));
        
        // Check for new incidents (ones not in previous list)
        const hasNewIncidents = limitedData.some(inc => !prevIds.has(inc.id));
        const hasUpdates = limitedData.some(inc => {
          const oldInc = prevIncidents.find(i => i.id === inc.id);
          return oldInc && (oldInc.status !== inc.status || oldInc.urgency_level !== inc.urgency_level);
        });
        
        const hasChanges = showLoading || // Initial load always updates
                         hasNewIncidents || // New incidents detected
                         hasUpdates || // Existing incidents updated
                         limitedData.length !== prevIncidents.length; // Count changed
        
        if (hasChanges) {
          if (hasNewIncidents) {
            console.log('📊 Dashboard: New incidents detected - adding to list smoothly');
          }
          return limitedData;
        }
        return prevIncidents; // No changes, keep previous state
      });
    } catch (err) {
      console.error('Error fetching incidents:', err);
      // Don't clear incidents on error - keep showing what we have
    } finally {
      // Only turn off loading if we turned it on
      if (showLoading && incidents.length === 0) {
        setLoading(false);
      }
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
      critical: 'badge-critical',
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low',
    };
    return urgencyClasses[urgency] || 'badge-medium';
  };


  // Check if resident is verified
  const isResident = user?.role === 'resident';
  const isVerified = user?.verification_status === 'verified';
  const isPending = user?.verification_status === 'pending';

  return (
    <DashboardLayout onReportSuccess={fetchIncidents}>
        {/* Verification Status Banner (For Residents) */}
        {isResident && !isVerified && (
          <div className="section-modern" style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            background: isPending 
              ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%)' 
              : 'linear-gradient(135deg, rgba(223, 41, 53, 0.1) 0%, rgba(244, 67, 54, 0.1) 100%)',
            border: `1px solid ${isPending ? 'rgba(255, 193, 7, 0.3)' : 'rgba(223, 41, 53, 0.3)'}`,
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem' }}>
                {isPending ? '⏳' : '❌'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                  {isPending ? 'Account Verification Pending' : 'Account Not Verified'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {isPending 
                    ? 'Your documents are being reviewed. You will receive a notification once verified.'
                    : 'Please complete your account verification to report incidents. False reports may result in account suspension.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Super Admin: Key highlights */}
        {isSuperAdmin && (
          <div className="section-modern super-admin-highlights" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Super Admin — Key areas
            </h3>
            <div className="super-admin-cards">
              <button type="button" onClick={() => navigate('/admin/create-user')} className="super-admin-card">
                <span className="super-admin-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </span>
                <span className="super-admin-card-label">Account Creation</span>
              </button>
              <button type="button" onClick={() => navigate('/admin/accounts')} className="super-admin-card">
                <span className="super-admin-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                <span className="super-admin-card-label">Account Management</span>
              </button>
              <button type="button" onClick={() => navigate('/map')} className="super-admin-card">
                <span className="super-admin-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                    <line x1="8" y1="2" x2="8" y2="18"/>
                    <line x1="16" y1="6" x2="16" y2="22"/>
                  </svg>
                </span>
                <span className="super-admin-card-label">Map View</span>
              </button>
              <button type="button" onClick={() => document.getElementById('dashboard-stats')?.scrollIntoView({ behavior: 'smooth' })} className="super-admin-card">
                <span className="super-admin-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </span>
                <span className="super-admin-card-label">Dashboard Analytics</span>
              </button>
              <button type="button" onClick={() => navigate('/admin/verify-residents')} className="super-admin-card">
                <span className="super-admin-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                  </svg>
                </span>
                <span className="super-admin-card-label">Resident Verification</span>
              </button>
              <button type="button" onClick={() => navigate('/admin/sound-alerts')} className="super-admin-card">
                <span className="super-admin-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                </span>
                <span className="super-admin-card-label">Sound Alert Management</span>
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div id="dashboard-stats" className="stats-grid-modern">
          <div className="stat-card-modern stat-primary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">{isSuperAdmin ? 'Total Incidents (All Municipalities)' : 'Total Incidents'}</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>

          <div className="stat-card-modern stat-active">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Active</p>
              <p className="stat-value">{stats.active}</p>
            </div>
          </div>

          <div className="stat-card-modern stat-resolved">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Resolved</p>
              <p className="stat-value">{stats.resolved}</p>
            </div>
          </div>

          <div className="stat-card-modern stat-critical">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Critical</p>
              <p className="stat-value">{stats.critical}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Charts - Only for barangay officials/admins and municipal admins */}
        {(user?.role === 'barangay_official' || user?.role === 'admin' || user?.role === 'municipal_admin') && (
          <DashboardCharts 
            barangayId={user?.barangay_id}
            municipalityId={user?.municipality_id}
            userRole={user?.role}
          />
        )}

        {/* Recent Incidents Section */}
        <div className="section-modern">
          <div className="section-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>{isSuperAdmin ? 'Recent Incidents (All Municipalities)' : 'Recent Incidents'}</h2>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--success)'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--success)',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  <span>Live</span>
                </div>
              </div>
              <p className="section-subtitle">{incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'} • Auto-updating every second</p>
            </div>
            <button 
              onClick={() => navigate('/incidents')} 
              className="btn-link"
            >
              View All
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading incidents...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3>No incidents yet</h3>
              <p>
                {user?.role === 'resident' 
                  ? 'Start by reporting your first emergency incident'
                  : 'No incidents have been reported yet'}
              </p>
            </div>
          ) : (
            <div className="incidents-grid">
              {incidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className="incident-card-modern"
                  onClick={() => {
                    setSelectedIncidentId(incident.id);
                    setShowIncidentModal(true);
                  }}
                >
                  <div className="incident-card-header">
                    <h3>{incident.title}</h3>
                    <div className="badge-group">
                      <span className={`badge ${getStatusBadge(incident.status)}`}>
                        {incident.status.replace('_', ' ')}
                      </span>
                      <span className={`badge ${getUrgencyBadge(incident.urgency_level)}`}>
                        {incident.urgency_level}
                      </span>
                    </div>
                  </div>
                  <div className="incident-card-body">
                    <div className="incident-meta">
                      <span className="meta-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        {incident.location_address || 'Location not specified'}
                      </span>
                      <span className="meta-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {new Date(incident.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="incident-description">
                      {incident.description?.substring(0, 100)}
                      {incident.description?.length > 100 ? '...' : ''}
                    </p>
                  </div>
                  <div className="incident-card-footer">
                    <span className="incident-type">{incident.incident_type}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Incident Details Modal */}
      <IncidentDetailsModal
        isOpen={showIncidentModal}
        onClose={() => {
          setShowIncidentModal(false);
          setSelectedIncidentId(null);
        }}
        incidentId={selectedIncidentId}
        onUpdate={() => {
          fetchIncidents(false); // Refresh incidents list
        }}
      />
    </DashboardLayout>
  );
};

export default Dashboard;
