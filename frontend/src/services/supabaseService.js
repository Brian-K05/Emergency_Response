import { supabase } from '../lib/supabase';

// Helper function for query timeouts
const QUERY_TIMEOUT = 3000; // 3 seconds

const withTimeout = async (promise, timeoutMs) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
  );
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (err) {
    if (err.message === 'Query timeout') {
      throw new Error('Query timeout');
    }
    throw err;
  }
};

export const supabaseService = {
  // Municipalities
  getMunicipalities: async () => {
    try {
      // Simple query without Promise.race to avoid abort issues
      const { data, error } = await supabase
        .from('municipalities')
        .select('*')
        .order('name');
      
      if (error) {
        // Don't throw for AbortError, just return empty array
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.warn('Municipalities request was aborted');
          return [];
        }
        console.error('Error fetching municipalities:', error);
        throw new Error(`Failed to fetch municipalities: ${error.message || 'Unknown error'}`);
      }
      return data || [];
    } catch (err) {
      // Don't throw timeout errors, just return empty array
      if (err.message?.includes('timeout') || err.name === 'AbortError') {
        console.warn('Municipalities query failed:', err.message);
        return [];
      }
      throw err;
    }
  },

  getBarangays: async (municipalityId) => {
    if (!municipalityId) return [];
    
    try {
      const queryPromise = supabase
        .from('barangays')
        .select('*')
        .eq('municipality_id', municipalityId)
        .order('name');
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      );
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
      if (error) {
        // Don't throw for AbortError, just return empty array
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.warn('Barangays request was aborted');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (err) {
      if (err.message?.includes('timeout')) {
        console.warn('Barangays query timed out');
        return [];
      }
      throw err;
    }
  },

  // Incidents
  getIncidents: async (filters = {}) => {
    // Try simplified query first - if this works, we can add relationships back
    let query = supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.incident_type) {
      query = query.eq('incident_type', filters.incident_type);
    }
    if (filters.municipality_id) {
      query = query.eq('municipality_id', filters.municipality_id);
    }
    if (filters.barangay_id) {
      query = query.eq('barangay_id', filters.barangay_id);
    }
    if (filters.urgency_level) {
      query = query.eq('urgency_level', filters.urgency_level);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching incidents:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return data || [];
  },

  getIncident: async (id) => {
    try {
      // Prefer RPC so reporter is visible (bypasses RLS on users for reporter row)
      const incidentId = typeof id === 'string' ? parseInt(id, 10) : id;
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_incident_with_reporter', {
        p_incident_id: incidentId,
      });
      if (!rpcError && rpcData) {
        return rpcData;
      }
      // Fallback: direct select with reporter embed (may be null if RLS blocks reporter)
      const { data, error } = await supabase
        .from('incidents')
        .select('*, reporter:users!incidents_reporter_id_fkey(id, full_name, email, phone_number)')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching incident:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      if (!data) {
        console.warn('Incident not found:', id);
        return null;
      }
      
      return data;
    } catch (err) {
      if (err.message?.includes('timeout')) {
        console.warn('Get incident query timed out');
        return null;
      }
      console.error('Error in getIncident:', err);
      throw err;
    }
  },

  getIncidentUpdates: async (incidentId) => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('incident_updates')
          .select('*, user:users(id, full_name, email)')
          .eq('incident_id', incidentId)
          .order('created_at', { ascending: true }),
        QUERY_TIMEOUT
      );
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      if (err.message?.includes('timeout')) {
        console.warn('Get incident updates query timed out');
        return [];
      }
      throw err;
    }
  },

  getIncidentMedia: async (incidentId) => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('incident_media')
          .select('*')
          .eq('incident_id', incidentId),
        QUERY_TIMEOUT
      );
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      if (err.message?.includes('timeout')) {
        console.warn('Get incident media query timed out');
        return [];
      }
      throw err;
    }
  },

  updateIncidentStatus: async (id, status, message = '') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current incident
      const { data: currentIncident } = await supabase
        .from('incidents')
        .select('status')
        .eq('id', id)
        .single();

      if (!currentIncident) throw new Error('Incident not found');

      // Update incident
      const updateData = { status };
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await withTimeout(
        supabase
          .from('incidents')
          .update(updateData)
          .eq('id', id)
          .select()
          .single(),
        QUERY_TIMEOUT
      );

      if (error) throw error;

      // Create update log
      await supabase
        .from('incident_updates')
        .insert({
          incident_id: id,
          updated_by: user.id,
          update_message: message || `Status changed from ${currentIncident.status} to ${status}`,
          previous_status: currentIncident.status,
          new_status: status,
        });

      // Create notification for reporter
      if (data.reporter_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: data.reporter_id,
            incident_id: id,
            notification_type: 'status_update',
            title: 'Incident Status Updated',
            message: `Your incident status has been updated to: ${status}`,
          });
      }

      return data;
    } catch (err) {
      if (err.message?.includes('timeout')) {
        console.warn('Update incident status query timed out');
        throw new Error('Failed to update status due to timeout.');
      }
      throw err;
    }
  },

  createIncident: async (incidentData) => {
    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    // Check if resident is verified
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, verification_status')
      .eq('id', authUser.id)
      .single();

    if (userProfile?.role === 'resident' && userProfile?.verification_status !== 'verified') {
      throw new Error('Your account must be verified before reporting incidents. Please wait for account verification.');
    }

    // Extract mediaFiles from incidentData (it's not a column in incidents table)
    const { mediaFiles, ...incidentFields } = incidentData;

    // Create incident
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .insert({
        reporter_id: authUser.id,
        ...incidentFields,
      })
      .select()
      .single();

    if (incidentError) throw incidentError;

    // Upload media files if any
    if (mediaFiles && mediaFiles.length > 0) {
      const mediaPromises = mediaFiles.map(async (file) => {
        try {
          // Upload to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${incident.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          // Don't include bucket name in path - it's already specified in .from()
          const filePath = fileName;

          const { error: uploadError } = await supabase.storage
            .from('incident-media')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            // Don't throw - allow incident to be created even if media upload fails
            return null;
          }

          // Save media record
          // Store just the filename (not the bucket name) - getPublicUrl() will handle the bucket
          const { data: media, error: mediaError } = await supabase
            .from('incident_media')
            .insert({
              incident_id: incident.id,
              file_path: filePath, // Just the filename, e.g., "5_1769744715044_ngd15a.png"
              file_name: file.name,
              file_type: file.type.startsWith('image/') ? 'image' : 'video',
              file_size: file.size,
              mime_type: file.type,
            })
            .select()
            .single();

          if (mediaError) {
            console.error('Media record insert error:', mediaError);
            // Don't throw - allow incident to be created even if media record fails
            return null;
          }
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('incident-media')
            .getPublicUrl(filePath);
            
          return { ...media, url: urlData.publicUrl };
        } catch (err) {
          console.error('Error processing media file:', err);
          // Don't throw - allow incident to be created even if media processing fails
          return null;
        }
      });

      // Wait for all media uploads, but don't fail if some fail
      const results = await Promise.all(mediaPromises);
      const successful = results.filter(r => r !== null);
      if (successful.length < mediaFiles.length) {
        console.warn(`Only ${successful.length} of ${mediaFiles.length} media files uploaded successfully`);
      }
    }

    // Create initial update
    await supabase
      .from('incident_updates')
      .insert({
        incident_id: incident.id,
        updated_by: authUser.id,
        update_message: 'Incident reported',
        new_status: 'reported',
      });

    // Notifications are automatically sent via database trigger (notify_incident_reported)
    // This ensures all relevant users are notified:
    // - Barangay Officials (Priority 1 - fastest response)
    // - MDRRMO Staff (Awareness - municipal level)
    // - Emergency Responders (if urgency is high/critical or specific incident types)
    // - Reporter (confirmation)

    return incident;
  },

  // Notifications
  getNotifications: async (unreadOnly = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('notifications')
      .select('*, incident:incidents(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getUnreadCount: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  markNotificationAsRead: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  markAllNotificationsAsRead: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  },

  // Mark all notifications for a specific incident as read
  markIncidentNotificationsAsRead: async (incidentId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (!incidentId) return;

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('incident_id', incidentId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking incident notifications as read:', error);
      throw error;
    }
    
    console.log('✅ Marked all notifications as read for incident:', incidentId);
  },

  // Real-time subscriptions
  subscribeToIncidents: (callback) => {
    return supabase
      .channel('incidents')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'incidents' },
        callback
      )
      .subscribe();
  },

  subscribeToNotifications: (userId, callback) => {
    return supabase
      .channel('notifications')
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  // Super admin: get all users for account management (monitoring only)
  getUsersForAdmin: async (filters = {}) => {
    let query = supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        full_name,
        role,
        phone_number,
        municipality_id,
        barangay_id,
        is_active,
        verification_status,
        created_at,
        municipality:municipalities(id, name),
        barangay:barangays(id, name)
      `)
      .order('created_at', { ascending: false });

    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.municipality_id) {
      query = query.eq('municipality_id', filters.municipality_id);
    }
    if (filters.barangay_id) {
      query = query.eq('barangay_id', filters.barangay_id);
    }
    if (filters.is_active !== undefined && filters.is_active !== '') {
      query = query.eq('is_active', filters.is_active === true || filters.is_active === 'true');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};

