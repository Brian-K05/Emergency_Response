import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import DashboardLayout from '../components/DashboardLayout';
import IncidentDetailsModal from '../components/IncidentDetailsModal';
import soundAlert from '../utils/soundAlert';

const Notifications = () => {
  // eslint-disable-next-line no-unused-vars
  const _nav = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const previousNotificationIds = useRef(new Set());

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Subscribe to real-time notifications (NO SOUNDS - DashboardLayout handles all sounds globally)
  // This subscription is only for updating the notifications list in real-time
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabaseService.subscribeToNotifications(user.id, (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const notification = payload.new;
        
        // Check if this is a new notification (not already processed)
        if (!previousNotificationIds.current.has(notification.id)) {
          previousNotificationIds.current.add(notification.id);
          
          // Only refresh notifications list - DashboardLayout handles all sound alerts globally
          // This prevents duplicate sounds
          console.log('📬 New notification received (sound handled by DashboardLayout):', notification.id);
          fetchNotifications();
        }
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await supabaseService.getNotifications(filter === 'unread');
      
      // Update previous notification IDs set
      if (data && data.length > 0) {
        const currentIds = new Set(data.map(n => n.id));
        previousNotificationIds.current = currentIds;
      }
      
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await supabaseService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabaseService.markAllNotificationsAsRead();
      await fetchNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      new_incident: '🚨',
      incident_assigned: '👮',
      status_update: '📝',
      escalation_request: '🚨',
      incident_reported: '✅',
      incident_resolved: '✅',
    };
    return icons[type] || '🔔';
  };

  const handleNotificationClick = (notification) => {
    // Stop all sounds and mark incident as viewed when notification is clicked
    if (notification.incident_id) {
      // Stop sounds immediately when clicking notification
      if (window.markIncidentAsViewed) {
        window.markIncidentAsViewed(notification.incident_id);
      } else {
        // Fallback: stop sounds directly
        soundAlert.stopAllSounds();
      }
    }
    
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.incident_id) {
      setSelectedIncidentId(notification.incident_id);
      setShowIncidentModal(true);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="section-modern">
        <div className="section-header">
          <h2>Notifications</h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="btn-secondary">
                Mark All Read
              </button>
            )}
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {unreadCount} unread
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            onClick={() => setFilter('all')}
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
          >
            Unread
            {filter === 'all' && unreadCount > 0 && (
              <span className="tab-badge">{unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
          >
            Read
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h3>No notifications</h3>
            <p>You're all caught up! New notifications will appear here.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h3>{notification.title}</h3>
                    {!notification.is_read && (
                      <span className="badge badge-assigned">New</span>
                    )}
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  <div className="notification-footer">
                    <span className="notification-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    {notification.incident_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Stop sounds immediately when clicking "View Incident"
                          if (window.markIncidentAsViewed) {
                            window.markIncidentAsViewed(notification.incident_id);
                          } else {
                            soundAlert.stopAllSounds();
                          }
                          setSelectedIncidentId(notification.incident_id);
                          setShowIncidentModal(true);
                        }}
                        className="btn-link-small"
                      >
                        View Incident
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
                    )}
                  </div>
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
          // Refresh notifications when modal closes (in case notifications were marked as read)
          fetchNotifications();
        }}
        incidentId={selectedIncidentId}
        onUpdate={() => {
          fetchNotifications(); // Refresh notifications list
        }}
      />
    </DashboardLayout>
  );
};

export default Notifications;
