import { supabase } from '../lib/supabase';

export const statisticsService = {
  // Get monthly statistics for a barangay
  getBarangayMonthlyStats: async (barangayId, months = 12) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate date range (last N months)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Fetch incidents for the barangay
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('id, incident_type, status, urgency_level, created_at')
        .eq('barangay_id', barangayId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Initialize all months in range
      for (let i = 0; i < months; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        monthlyData[monthKey] = {
          month: monthLabel,
          date: monthKey,
          total: 0,
          byType: {},
          byStatus: {},
          byUrgency: {},
        };
      }

      // Process incidents
      incidents?.forEach(incident => {
        const date = new Date(incident.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].total++;
          
          // Count by type
          monthlyData[monthKey].byType[incident.incident_type] = 
            (monthlyData[monthKey].byType[incident.incident_type] || 0) + 1;
          
          // Count by status
          monthlyData[monthKey].byStatus[incident.status] = 
            (monthlyData[monthKey].byStatus[incident.status] || 0) + 1;
          
          // Count by urgency
          monthlyData[monthKey].byUrgency[incident.urgency_level] = 
            (monthlyData[monthKey].byUrgency[incident.urgency_level] || 0) + 1;
        }
      });

      return Object.values(monthlyData);
    } catch (err) {
      console.error('Error fetching barangay monthly stats:', err);
      throw err;
    }
  },

  // Get monthly statistics for all barangays in a municipality
  getMunicipalMonthlyStats: async (municipalityId, months = 12) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate date range (last N months)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Fetch all barangays in the municipality
      const { data: barangays, error: barangayError } = await supabase
        .from('barangays')
        .select('id, name')
        .eq('municipality_id', municipalityId);

      if (barangayError) throw barangayError;

      // Fetch incidents for all barangays in the municipality
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('id, barangay_id, incident_type, status, urgency_level, created_at')
        .eq('municipality_id', municipalityId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by barangay and month
      const barangayData = {};
      barangays?.forEach(barangay => {
        barangayData[barangay.id] = {
          barangayId: barangay.id,
          barangayName: barangay.name,
          monthlyStats: {},
        };
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Initialize all months in range for each barangay
      barangays?.forEach(barangay => {
        for (let i = 0; i < months; i++) {
          const date = new Date(startDate);
          date.setMonth(date.getMonth() + i);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          barangayData[barangay.id].monthlyStats[monthKey] = {
            month: monthLabel,
            date: monthKey,
            total: 0,
            byType: {},
            byStatus: {},
            byUrgency: {},
          };
        }
      });

      // Process incidents
      incidents?.forEach(incident => {
        if (!barangayData[incident.barangay_id]) return;
        
        const date = new Date(incident.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const stats = barangayData[incident.barangay_id].monthlyStats[monthKey];
        
        if (stats) {
          stats.total++;
          
          // Count by type
          stats.byType[incident.incident_type] = (stats.byType[incident.incident_type] || 0) + 1;
          
          // Count by status
          stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1;
          
          // Count by urgency
          stats.byUrgency[incident.urgency_level] = (stats.byUrgency[incident.urgency_level] || 0) + 1;
        }
      });

      // Convert to array format
      return Object.values(barangayData).map(barangay => ({
        barangayId: barangay.barangayId,
        barangayName: barangay.barangayName,
        monthlyStats: Object.values(barangay.monthlyStats),
      }));
    } catch (err) {
      console.error('Error fetching municipal monthly stats:', err);
      throw err;
    }
  },
};


