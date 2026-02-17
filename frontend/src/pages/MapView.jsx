import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';
import DashboardLayout from '../components/DashboardLayout';
import IncidentDetailsModal from '../components/IncidentDetailsModal';

const MapView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    incident_type: '',
    urgency_level: '',
  });

  useEffect(() => {
    fetchIncidents();
  }, [filters]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const activeFilters = {};
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          activeFilters[key] = filters[key];
        }
      });
      
      const data = await supabaseService.getIncidents(activeFilters);
      setIncidents(data || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
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

  const getStatusColor = (status) => {
    const colors = {
      reported: '#FFD701',
      assigned: '#0446A7',
      in_progress: '#0446A7',
      resolved: '#17670C',
      cancelled: '#e6e8e6',
    };
    return colors[status] || '#e6e8e6';
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isMunicipalAdmin = user?.role === 'municipal_admin';

  return (
    <DashboardLayout>
      <div className="section-modern">
        <div className="section-header">
          <div>
            <h2>{isSuperAdmin ? 'Incident Map View (System-Wide)' : isMunicipalAdmin ? 'Incident Map View (Your Municipality)' : 'Incident Map View'}</h2>
            <p className="section-subtitle">
              {incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'} on map
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section-modern" style={{ marginBottom: '1.5rem' }}>
          <div className="form-row-modern">
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
          </div>
        </div>

        {/* Map and Incident List */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              </svg>
            </div>
            <h3>No incidents found</h3>
            <p>No incidents match the current filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Map Area - Placeholder */}
            <div style={{ 
              background: 'var(--bg-glass)', 
              padding: '2rem', 
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              minHeight: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '1rem',
              backgroundImage: 'linear-gradient(135deg, rgba(4, 70, 167, 0.05) 0%, rgba(23, 103, 12, 0.05) 100%)'
            }}>
              <div style={{ fontSize: '4rem' }}>🗺️</div>
              <h3 style={{ margin: 0 }}>Map View</h3>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px', margin: 0 }}>
                Map integration (Leaflet.js or Google Maps) can be added here to display incidents as markers.
                For now, incidents are listed on the right.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                {incidents.length} incidents with coordinates available
              </p>
            </div>

            {/* Incident List */}
            <div>
              <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Incidents ({incidents.length})</h4>
              <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {incidents.map((incident) => (
                  <div 
                    key={incident.id} 
                    className="incident-card-modern"
                    onClick={() => {
                      setSelectedIncidentId(incident.id);
                      setShowIncidentModal(true);
                    }}
                    style={{ 
                      cursor: 'pointer',
                      borderLeft: `4px solid ${getStatusColor(incident.status)}`
                    }}
                  >
                    <div className="incident-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <span style={{ fontSize: '1.5rem' }}>{getTypeIcon(incident.incident_type)}</span>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{incident.title}</h3>
                      </div>
                      <span className={`badge ${incident.status === 'reported' ? 'badge-reported' : incident.status === 'assigned' ? 'badge-assigned' : incident.status === 'resolved' ? 'badge-resolved' : 'badge-default'}`}>
                        {incident.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="incident-card-body">
                      <div className="incident-meta">
                        <span className="meta-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {incident.location_address}
                        </span>
                        {incident.barangay && (
                          <span className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            </svg>
                            {incident.barangay.name}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                        <strong>Coordinates:</strong> {incident.latitude?.toFixed(6)}, {incident.longitude?.toFixed(6)}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                        <strong>Urgency:</strong> {incident.urgency_level} • <strong>Reported:</strong> {new Date(incident.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

export default MapView;
