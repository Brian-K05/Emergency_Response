import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import { shouldReceiveSoundAlerts } from '../utils/roleUtils';
import ProfileModal from './ProfileModal';
import Modal from './Modal';
import IncidentReport from '../pages/IncidentReport';
import soundAlert from '../utils/soundAlert';

const DashboardLayout = ({ children, onReportSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Subscribe to notifications and play sound alerts (ONLY for barangay officials and admins, NOT residents)
  useEffect(() => {
    if (!user?.id) return;

    // Only enable sound alerts for barangay officials and admins (not residents)
    const shouldPlaySounds = user?.role && shouldReceiveSoundAlerts(user.role);
    
    if (!shouldPlaySounds) {
      // Residents don't get sound alerts - exit early
      return;
    }

    // Resume audio context on user interaction
    soundAlert.resume();

    // Load sound configurations on mount
    soundAlert.loadSoundConfigs();

    // Sound for notifications is handled by incident subscription below (checkAndPlayAlert)

    // Check for existing unread notifications on mount (in case user just logged in)
    // BUT don't play sounds - the incident subscription handles all sound alerts
    // This prevents duplicate alerts and ensures sounds only play once per incident
    const checkExistingNotifications = setTimeout(async () => {
      try {
        const unreadNotifications = await supabaseService.getNotifications(true); // true = unread only
        if (unreadNotifications && unreadNotifications.length > 0) {
          // Check each unread notification - find incidents that haven't been viewed
          // But don't play sounds here - incident subscription handles it
          for (const notification of unreadNotifications) {
            if (notification && !notification.is_read && notification.incident_id) {
              const incidentIdStr = String(notification.incident_id);
              if (!viewedIncidents.has(incidentIdStr)) {
                // Incident not viewed yet - but don't play sound here
                // The incident subscription will handle it when it detects the incident
                console.log('📬 Unread notification found (sound handled by incident subscription):', notification.id);
                break; // Only check the most recent unread notification
              } else {
                console.log('⏭️ Skipping notification - incident already viewed:', notification.incident_id);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not check existing notifications:', err);
      }
    }, 1000); // Wait 1 second for audio context to be ready

    // Subscribe to real-time notifications (NO SOUNDS - incident subscription handles all alerts)
    // This subscription is kept for potential future use, but doesn't play sounds to avoid duplicates
    // The incident subscription (FAST PATH) already plays sounds immediately when incidents are created
    const notificationSubscription = supabaseService.subscribeToNotifications(user.id, (payload) => {
      // Subscription is filtered by user_id, so we only receive our own notifications
      const record = payload.new || payload.record;
      if (!record) return;
      // Municipal gets alert sound ONLY when barangay requested assistance (escalation)
      if (record.notification_type === 'escalation_request') {
        soundAlert.playEscalationAlert();
      }
    });

    // Track processed incident IDs to avoid duplicate alerts
    const processedIncidentIds = new Set();
    
    // Load viewed incidents from localStorage (persists across page refreshes)
    const getViewedIncidents = () => {
      try {
        const viewed = localStorage.getItem(`viewed_incidents_${user.id}`);
        return viewed ? new Set(JSON.parse(viewed)) : new Set();
      } catch (e) {
        return new Set();
      }
    };
    
    // Save viewed incidents to localStorage
    const saveViewedIncidents = (viewedSet) => {
      try {
        localStorage.setItem(`viewed_incidents_${user.id}`, JSON.stringify(Array.from(viewedSet)));
      } catch (e) {
        console.warn('Could not save viewed incidents:', e);
      }
    };
    
    // Initialize viewed incidents set
    const viewedIncidents = getViewedIncidents();
    
    // Function to mark incident as viewed (stops sounds and prevents future alerts)
    const markIncidentAsViewed = (incidentId) => {
      if (!incidentId) return;
      
      // Stop any playing sounds
      soundAlert.stopAllSounds();
      
      // Mark as viewed
      viewedIncidents.add(String(incidentId));
      processedIncidentIds.add(incidentId);
      
      // Save to localStorage
      saveViewedIncidents(viewedIncidents);
      
      console.log('👁️ Incident marked as viewed:', incidentId);
    };
    
    // Expose function globally so IncidentDetails can call it
    window.markIncidentAsViewed = markIncidentAsViewed;
    
    // Function to check if incident is relevant and play alert
    const checkAndPlayAlert = (incident) => {
      if (!incident || !incident.id) return;
      
      const incidentIdStr = String(incident.id);
      
      // Skip if already processed or viewed
      if (processedIncidentIds.has(incident.id) || viewedIncidents.has(incidentIdStr)) {
        console.log('⏭️ Incident already processed or viewed, skipping alert:', incident.id);
        return;
      }
      processedIncidentIds.add(incident.id);
      
      console.log('🔍 Checking incident relevance:', {
        incidentId: incident.id,
        incidentBarangay: incident.barangay_id,
        incidentMunicipality: incident.municipality_id,
        userRole: user.role,
        userBarangay: user.barangay_id,
        userMunicipality: user.municipality_id
      });
      
      // Barangay: sound on new incident in their barangay. Municipal: no sound on new incident (incidents still show live); sound only when barangay submits "Request Assistance".
      let shouldAlert = false;
      if (user.role === 'barangay_official') {
        shouldAlert = incident.barangay_id && user.barangay_id && 
                     String(incident.barangay_id) === String(user.barangay_id);
      }
      
      if (shouldAlert) {
        console.log('✅ Incident is relevant to user, playing emergency alert IMMEDIATELY');
        // Play emergency alert immediately (don't wait for notification)
        soundAlert.playEmergencyAlert();
      } else {
        console.log('ℹ️ Incident not relevant to current user, skipping alert');
      }
    };

    // FAST PATH: Subscribe to incidents directly for immediate sound alerts
    // This plays sounds as soon as incidents are created, without waiting for notifications
    const incidentSubscription = supabaseService.subscribeToIncidents((payload) => {
      console.log('🔔 Raw incident payload:', payload);
      
      const eventType = payload.eventType || payload.type || payload.event;
      const incident = payload.new || payload.record || payload.data;
      
      if ((eventType === 'INSERT' || eventType === 'insert') && incident) {
        console.log('🚨 New incident detected directly (FAST PATH):', incident);
        checkAndPlayAlert(incident);
      }
    });

    // POLLING BACKUP: Check for new incidents every 2 seconds
    // This ensures we catch new incidents even if real-time subscription fails
    const pollingInterval = setInterval(async () => {
      try {
        // Get recent incidents (last 1 minute)
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { data: recentIncidents, error } = await supabase
          .from('incidents')
          .select('id, barangay_id, municipality_id, created_at')
          .gte('created_at', oneMinuteAgo)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.warn('Error polling for new incidents:', error);
          return;
        }
        
        if (recentIncidents && recentIncidents.length > 0) {
          // Check each recent incident
          recentIncidents.forEach(incident => {
            if (!processedIncidentIds.has(incident.id)) {
              console.log('📡 Polling detected new incident:', incident.id);
              checkAndPlayAlert(incident);
            }
          });
        }
      } catch (err) {
        console.warn('Error in polling check:', err);
      }
    }, 2000); // Check every 2 seconds

    return () => {
      clearTimeout(checkExistingNotifications);
      if (notificationSubscription) {
        notificationSubscription.unsubscribe();
      }
      if (incidentSubscription) {
        incidentSubscription.unsubscribe();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleReportSuccess = () => {
    setShowReportModal(false);
    if (onReportSuccess) {
      onReportSuccess();
    } else {
      // Refresh the page data by reloading
      window.location.reload();
    }
  };

  return (
    <div className="dashboard-modern">
      {/* Top Navigation Bar */}
      <header className="dashboard-topbar">
        <div className="topbar-left">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1>Emergency Response</h1>
          </div>
        </div>
        <div className="topbar-right">
          <button 
            onClick={() => setShowProfileModal(true)} 
            className="profile-icon-btn"
            title="Profile"
          >
            <div className="profile-icon-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </button>
        </div>
      </header>

      {/* Side Navigation */}
      <aside className="dashboard-sidebar">
        <nav className="sidebar-nav">
          <button 
            onClick={() => navigate('/dashboard')} 
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Dashboard</span>
          </button>
          {/* Report Incident - Only for verified residents */}
          {user?.role === 'resident' && user?.verification_status === 'verified' && (
            <button 
              onClick={() => setShowReportModal(true)} 
              className="nav-item nav-item-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Report Incident</span>
            </button>
          )}
          <button 
            onClick={() => navigate('/incidents')} 
            className={`nav-item ${isActive('/incidents') || location.pathname.startsWith('/incidents/') ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>View Incidents</span>
          </button>
          {/* Super Admin: key areas in order — Map, Account Creation, Account Management, Resident Verification, Sound Alerts */}
          {user?.role === 'super_admin' && (
            <>
              <button 
                onClick={() => navigate('/map')} 
                className={`nav-item ${isActive('/map') ? 'active' : ''}`}
                title="Map view of municipalities scope"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                  <line x1="8" y1="2" x2="8" y2="18"/>
                  <line x1="16" y1="6" x2="16" y2="22"/>
                </svg>
                <span>Map View</span>
              </button>
              <button 
                onClick={() => navigate('/admin/create-user')} 
                className={`nav-item ${isActive('/admin/create-user') ? 'active' : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                <span>Account Creation</span>
              </button>
              <button 
                onClick={() => navigate('/admin/accounts')} 
                className={`nav-item ${isActive('/admin/accounts') ? 'active' : ''}`}
                title="View and monitor all accounts"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Account Management</span>
              </button>
              <button 
                onClick={() => navigate('/admin/verify-residents')} 
                className={`nav-item ${isActive('/admin/verify-residents') ? 'active' : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                </svg>
                <span>Resident Verification</span>
              </button>
              <button 
                onClick={() => navigate('/admin/sound-alerts')} 
                className={`nav-item ${isActive('/admin/sound-alerts') ? 'active' : ''}`}
                title="Manage Sound Alerts"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                <span>Sound Alerts</span>
              </button>
            </>
          )}
          <button 
            onClick={() => navigate('/notifications')} 
            className={`nav-item ${isActive('/notifications') ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span>Notifications</span>
          </button>
          {/* Create User & Verify Residents — municipal_admin and admin (not super_admin; they have their own block above) */}
          {(user?.role === 'municipal_admin' || user?.role === 'admin') && (
            <>
              <button 
                onClick={() => navigate('/admin/create-user')} 
                className={`nav-item ${isActive('/admin/create-user') ? 'active' : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                <span>Create User</span>
              </button>
              <button 
                onClick={() => navigate('/admin/verify-residents')} 
                className={`nav-item ${isActive('/admin/verify-residents') ? 'active' : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                </svg>
                <span>Verify Residents</span>
              </button>
            </>
          )}
          {/* Map View — for municipal_admin, admin, mdrrmo (super_admin has it in block above) */}
          {(user?.role === 'admin' || user?.role === 'mdrrmo' || user?.role === 'municipal_admin') && (
            <button 
              onClick={() => navigate('/map')} 
              className={`nav-item ${isActive('/map') ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/>
                <line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              <span>Map View</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        {children}
      </main>

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />

      {/* Incident Report Modal - Always Available */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Emergency Incident"
        size="large"
      >
        <IncidentReport 
          onSuccess={handleReportSuccess}
          onCancel={() => setShowReportModal(false)}
        />
      </Modal>
    </div>
  );
};

export default DashboardLayout;
