import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import DashboardLayout from '../components/DashboardLayout';
import IncidentDetailsModal from '../components/IncidentDetailsModal';

const ViewIncidents = () => {
  // eslint-disable-next-line no-unused-vars
  const _nav = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    incident_type: '',
    urgency_level: '',
    municipality_id: '',
    barangay_id: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  useEffect(() => {
    fetchIncidents(true); // Show loading on initial load
    fetchMunicipalities();
    
    // Real-time subscription for instant updates
    const subscription = supabaseService.subscribeToIncidents((payload) => {
      const eventType = payload.eventType || payload.type;
      const newData = payload.new || payload.record;
      
      if ((eventType === 'INSERT' || eventType === 'insert') && newData) {
        // New incident detected - add to list immediately (optimistic update)
        console.log('🚨 New incident detected via real-time in ViewIncidents:', newData);
        
        // Add new incident to the list immediately
        setIncidents(prevIncidents => {
          // Check if already in list
          if (prevIncidents.some(inc => inc.id === newData.id)) {
            return prevIncidents;
          }
          
          // Add new incident at the top
          console.log('✅ Added new incident to ViewIncidents display immediately');
          return [newData, ...prevIncidents];
        });
        
        // Also do a full refresh to ensure data consistency (silent - no loading)
        setTimeout(() => fetchIncidents(false), 500);
      } else if (eventType === 'UPDATE' || eventType === 'update' || eventType === 'UPDATE') {
        // Incident updated - refresh silently (no loading)
        fetchIncidents(false);
      }
    });
    
    // Fast polling every 1 second for fast display updates (silent - no loading)
    const interval = setInterval(() => {
      fetchIncidents(false);
    }, 1000);
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (filters.municipality_id) {
      fetchBarangays(filters.municipality_id);
    } else {
      setBarangays([]);
    }
  }, [filters.municipality_id]);

  const fetchMunicipalities = async () => {
    try {
      const data = await supabaseService.getMunicipalities();
      setMunicipalities(data || []);
    } catch (err) {
      console.error('Error fetching municipalities:', err);
    }
  };

  const fetchBarangays = async (municipalityId) => {
    try {
      const data = await supabaseService.getBarangays(municipalityId);
      setBarangays(data || []);
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };

  const fetchIncidents = async (showLoading = false) => {
    try {
      // Only show loading spinner on initial load (when explicitly requested AND list is empty)
      // Never show loading during background refreshes
      const shouldShowLoading = showLoading && incidents.length === 0;
      if (shouldShowLoading) {
        setLoading(true);
      }
      
      const activeFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          activeFilters[key] = filters[key];
        }
      });
      
      const data = await supabaseService.getIncidents(activeFilters);
      
      // Apply search filter
      let filteredData = data;
      if (searchTerm) {
        filteredData = data.filter(incident =>
          incident.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.location_address?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setIncidents(filteredData || []);
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      if (name === 'municipality_id') {
        newFilters.barangay_id = '';
      }
      return newFilters;
    });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      fetchIncidents();
    }, 500);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      incident_type: '',
      urgency_level: '',
      municipality_id: '',
      barangay_id: '',
    });
    setSearchTerm('');
  };

  const handleReportSuccess = () => {
    fetchIncidents();
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

  const isSuperAdmin = user?.role === 'super_admin';
  const isMunicipalAdmin = user?.role === 'municipal_admin';

  return (
    <DashboardLayout onReportSuccess={handleReportSuccess}>
      <div className="section-modern">
        <div className="section-header">
          <div>
            <h2>{isSuperAdmin ? 'All Incidents (System-Wide)' : isMunicipalAdmin ? 'All Incidents (Your Municipality)' : 'All Incidents'}</h2>
            <p className="section-subtitle" style={{ marginTop: '0.25rem' }}>
              {incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'}
              {isSuperAdmin && ' across all municipalities'}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="filters-section-modern">
          <div className="form-group-modern" style={{ marginBottom: '0.25rem' }}>
            <label htmlFor="search" style={{ marginBottom: '0.25rem' }}>Search Incidents</label>
            <div className="input-with-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by title, description, or location..."
                className="input-modern"
                style={{ padding: '0.5rem 0.75rem 0.5rem 2.25rem', fontSize: '0.875rem' }}
              />
            </div>
          </div>

          <div className="filters-grid">
            <div className="form-group-modern">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="input-modern"
              >
                <option value="">All Status</option>
                <option value="reported">Reported</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group-modern">
              <label htmlFor="incident_type">Type</label>
              <select
                id="incident_type"
                name="incident_type"
                value={filters.incident_type}
                onChange={handleFilterChange}
                className="input-modern"
              >
                <option value="">All Types</option>
                <option value="fire">Fire</option>
                <option value="medical">Medical</option>
                <option value="accident">Accident</option>
                <option value="natural_disaster">Natural Disaster</option>
                <option value="crime">Crime</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group-modern">
              <label htmlFor="urgency_level">Urgency</label>
              <select
                id="urgency_level"
                name="urgency_level"
                value={filters.urgency_level}
                onChange={handleFilterChange}
                className="input-modern"
              >
                <option value="">All Urgency</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {(user?.role === 'admin' || user?.role === 'mdrrmo' || user?.role === 'super_admin' || user?.role === 'municipal_admin') && (
              <>
                <div className="form-group-modern">
                  <label htmlFor="municipality_id">Municipality</label>
                  <select
                    id="municipality_id"
                    name="municipality_id"
                    value={filters.municipality_id}
                    onChange={handleFilterChange}
                    className="input-modern"
                  >
                    <option value="">All Municipalities</option>
                    {municipalities.map((mun) => (
                      <option key={mun.id} value={mun.id}>
                        {mun.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-modern">
                  <label htmlFor="barangay_id">Barangay</label>
                  <select
                    id="barangay_id"
                    name="barangay_id"
                    value={filters.barangay_id}
                    onChange={handleFilterChange}
                    disabled={!filters.municipality_id}
                    className="input-modern"
                  >
                    <option value="">All Barangays</option>
                    {barangays.map((bar) => (
                      <option key={bar.id} value={bar.id}>
                        {bar.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={clearFilters} 
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>

        {/* Incidents List */}
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
            <h3>No incidents found</h3>
            <p>
              {Object.values(filters).some(f => f) || searchTerm 
                ? 'Try adjusting your filters' 
                : (user?.role === 'resident' 
                    ? 'Start by reporting your first emergency incident'
                    : 'No incidents have been reported yet')}
            </p>
            {Object.values(filters).some(f => f) || searchTerm ? (
              <button onClick={clearFilters} className="btn-secondary" style={{ marginTop: '1rem' }}>
                Clear Filters
              </button>
            ) : null}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <span style={{ fontSize: '1.5rem' }}>{getTypeIcon(incident.incident_type)}</span>
                    <h3>{incident.title}</h3>
                  </div>
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
                      {new Date(incident.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="incident-description">
                    {incident.description?.substring(0, 120)}
                    {incident.description?.length > 120 ? '...' : ''}
                  </p>
                </div>
                <div className="incident-card-footer">
                  <span className="incident-type">{incident.incident_type?.replace('_', ' ')}</span>
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
          fetchIncidents(); // Refresh incidents list
        }}
      />
    </DashboardLayout>
  );
};

export default ViewIncidents;
