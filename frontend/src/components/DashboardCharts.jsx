import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { statisticsService } from '../services/statisticsService';
import { useAuth } from '../context/AuthContext';

/* Northern Samar theme: blue, yellow, red, green, orange, beige */
const COLORS = ['#0446A7', '#FFD701', '#F63224', '#17670C', '#FF6A00', '#BC9678'];

const DashboardCharts = ({ barangayId, municipalityId, userRole }) => {
  const { user } = useAuth();
  const [barangayStats, setBarangayStats] = useState([]);
  const [municipalStats, setMunicipalStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [barangayId, municipalityId, userRole]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (userRole === 'barangay_official' || userRole === 'admin') {
        if (barangayId) {
          const stats = await statisticsService.getBarangayMonthlyStats(barangayId, 12);
          setBarangayStats(Array.isArray(stats) ? stats : []);
        }
      } else if (userRole === 'municipal_admin') {
        if (municipalityId) {
          const stats = await statisticsService.getMunicipalMonthlyStats(municipalityId, 12);
          setMunicipalStats(Array.isArray(stats) ? stats : []);
          if (Array.isArray(stats) && stats.length > 0 && !selectedBarangay) {
            setSelectedBarangay(String(stats[0].barangayId));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const selectedBarangayData = useMemo(() => {
    if (!selectedBarangay || !Array.isArray(municipalStats) || municipalStats.length === 0) {
      return [];
    }
    const selectedId = typeof selectedBarangay === 'string' ? parseInt(selectedBarangay, 10) : selectedBarangay;
    const barangay = municipalStats.find(b => {
      const bid = typeof b.barangayId === 'string' ? parseInt(b.barangayId, 10) : b.barangayId;
      return bid === selectedId;
    });
    return Array.isArray(barangay?.monthlyStats) ? barangay.monthlyStats : [];
  }, [municipalStats, selectedBarangay]);

  const chartData = useMemo(() => {
    try {
      const data = userRole === 'municipal_admin' ? selectedBarangayData : barangayStats;
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }
      return data.map(month => ({
        month: String(month?.month || ''),
        total: Number(month?.total || 0),
        fire: Number(month?.byType?.fire || 0),
        medical: Number(month?.byType?.medical || 0),
        accident: Number(month?.byType?.accident || 0),
        natural_disaster: Number(month?.byType?.natural_disaster || 0),
        crime: Number(month?.byType?.crime || 0),
        other: Number(month?.byType?.other || 0),
        reported: Number(month?.byStatus?.reported || 0),
        assigned: Number(month?.byStatus?.assigned || 0),
        in_progress: Number(month?.byStatus?.in_progress || 0),
        resolved: Number(month?.byStatus?.resolved || 0),
      }));
    } catch (error) {
      console.error('Error processing chart data:', error);
      return [];
    }
  }, [barangayStats, selectedBarangayData, userRole]);

  const typePieData = useMemo(() => {
    try {
      const data = userRole === 'municipal_admin' ? selectedBarangayData : barangayStats;
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }
      const totals = {};
      data.forEach(month => {
        if (month?.byType && typeof month.byType === 'object') {
          Object.keys(month.byType).forEach(type => {
            totals[type] = (totals[type] || 0) + Number(month.byType[type] || 0);
          });
        }
      });
      return Object.keys(totals)
        .filter(type => totals[type] > 0)
        .map(type => ({
          name: String(type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())),
          value: Number(totals[type]),
        }));
    } catch (error) {
      console.error('Error processing pie chart data:', error);
      return [];
    }
  }, [barangayStats, selectedBarangayData, userRole]);

  if (error) {
    return (
      <div className="dashboard-charts-section">
        <div className="section-modern" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header">
            <h2>Monthly Statistics</h2>
          </div>
          <p style={{ color: 'var(--error, #F63224)', textAlign: 'center', padding: '2rem' }}>
            Error loading statistics: {error}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (userRole === 'municipal_admin') {
    if (!Array.isArray(chartData) || chartData.length === 0 || !selectedBarangay) {
      return (
        <div className="dashboard-charts-section">
          <div className="section-modern" style={{ marginBottom: '1.5rem' }}>
            <div className="section-header">
              <h2>Monthly Statistics by Barangay</h2>
              {Array.isArray(municipalStats) && municipalStats.length > 0 && (
                <select
                  value={selectedBarangay || ''}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  className="input-modern"
                  style={{ minWidth: '200px' }}
                >
                  {municipalStats.map(barangay => (
                    <option key={barangay.barangayId} value={barangay.barangayId}>
                      {String(barangay.barangayName || '')}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              {!selectedBarangay ? 'Please select a barangay to view statistics.' : 'No data available yet. Statistics will appear once incidents are reported.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-charts-section">
        <div className="section-modern" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header">
            <h2>Monthly Statistics by Barangay</h2>
            <select
              value={selectedBarangay || ''}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className="input-modern"
              style={{ minWidth: '200px' }}
            >
              {Array.isArray(municipalStats) && municipalStats.map(barangay => (
                <option key={barangay.barangayId} value={barangay.barangayId}>
                  {String(barangay.barangayName || '')}
                </option>
              ))}
            </select>
          </div>

          {Array.isArray(chartData) && chartData.length > 0 && (
            <>
              <div className="chart-card">
                <h3>Incidents Over Time (Last 12 Months)</h3>
                <div style={{ width: '100%', height: '300px' }}>
                  <LineChart width={800} height={300} data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-tertiary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#0446A7" strokeWidth={2} name="Total Incidents" />
                  </LineChart>
                </div>
              </div>

              <div className="chart-card">
                <h3>Incidents by Type</h3>
                <div style={{ width: '100%', height: '300px', overflow: 'auto' }}>
                  <BarChart width={800} height={300} data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-tertiary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="fire" stackId="a" fill="#F63224" name="Fire" />
                    <Bar dataKey="medical" stackId="a" fill="#17670C" name="Medical" />
                    <Bar dataKey="accident" stackId="a" fill="#FFD701" name="Accident" />
                    <Bar dataKey="natural_disaster" stackId="a" fill="#8b5cf6" name="Natural Disaster" />
                    <Bar dataKey="crime" stackId="a" fill="#f59e0b" name="Crime" />
                    <Bar dataKey="other" stackId="a" fill="#6b7280" name="Other" />
                  </BarChart>
                </div>
              </div>

              <div className="chart-card">
                <h3>Status Distribution</h3>
                <div style={{ width: '100%', height: '300px', overflow: 'auto' }}>
                  <BarChart width={800} height={300} data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-tertiary)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="reported" fill="#0446A7" name="Reported" />
                    <Bar dataKey="assigned" fill="#FFD701" name="Assigned" />
                    <Bar dataKey="in_progress" fill="#f59e0b" name="In Progress" />
                    <Bar dataKey="resolved" fill="#17670C" name="Resolved" />
                  </BarChart>
                </div>
              </div>

              {Array.isArray(typePieData) && typePieData.length > 0 && (
                <div className="chart-card">
                  <h3>Total Incidents by Type</h3>
                  <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                    <PieChart width={400} height={300}>
                      <Pie
                        data={typePieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-tertiary)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (!Array.isArray(chartData) || chartData.length === 0) {
    return (
      <div className="dashboard-charts-section">
        <div className="section-modern" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header">
            <h2>Monthly Statistics (Last 12 Months)</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            No data available yet. Statistics will appear once incidents are reported.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-charts-section">
      <div className="section-modern" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <h2>Monthly Statistics (Last 12 Months)</h2>
        </div>

        <div className="chart-card">
          <h3>Incidents Over Time</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <LineChart width={800} height={300} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#0446A7" strokeWidth={2} name="Total Incidents" />
            </LineChart>
          </div>
        </div>

        <div className="chart-card">
          <h3>Incidents by Type</h3>
          <div style={{ width: '100%', height: '300px', overflow: 'auto' }}>
            <BarChart width={800} height={300} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="fire" stackId="a" fill="#F63224" name="Fire" />
              <Bar dataKey="medical" stackId="a" fill="#17670C" name="Medical" />
              <Bar dataKey="accident" stackId="a" fill="#FFD701" name="Accident" />
              <Bar dataKey="natural_disaster" stackId="a" fill="#8b5cf6" name="Natural Disaster" />
              <Bar dataKey="crime" stackId="a" fill="#f59e0b" name="Crime" />
              <Bar dataKey="other" stackId="a" fill="#6b7280" name="Other" />
            </BarChart>
          </div>
        </div>

        <div className="chart-card">
          <h3>Status Distribution</h3>
          <div style={{ width: '100%', height: '300px', overflow: 'auto' }}>
            <BarChart width={800} height={300} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="reported" fill="#0446A7" name="Reported" />
              <Bar dataKey="assigned" fill="#FFD701" name="Assigned" />
              <Bar dataKey="in_progress" fill="#f59e0b" name="In Progress" />
              <Bar dataKey="resolved" fill="#17670C" name="Resolved" />
            </BarChart>
          </div>
        </div>

        {Array.isArray(typePieData) && typePieData.length > 0 && (
          <div className="chart-card">
            <h3>Total Incidents by Type</h3>
            <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
              <PieChart width={400} height={300}>
                <Pie
                  data={typePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCharts;
