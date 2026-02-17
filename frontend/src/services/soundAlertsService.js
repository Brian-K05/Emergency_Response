// Sound Alerts Service
// Handles fetching and managing sound alert configurations

import { supabase } from '../lib/supabase';

export const soundAlertsService = {
  // Get all sound alerts
  getSoundAlerts: async () => {
    const { data, error } = await supabase
      .from('sound_alerts')
      .select('*')
      .eq('is_active', true)
      .order('alert_type');

    if (error) throw error;
    return data || [];
  },

  // Get sound alert by type
  getSoundAlert: async (alertType) => {
    const { data, error } = await supabase
      .from('sound_alerts')
      .select('*')
      .eq('alert_type', alertType)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  // Upload sound file and create/update sound alert
  uploadSoundAlert: async (alertType, file, volume = 0.7) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Delete old file if exists
    const { data: existingAlert } = await supabase
      .from('sound_alerts')
      .select('sound_file_path')
      .eq('alert_type', alertType)
      .single();

    if (existingAlert && existingAlert.sound_file_path && existingAlert.sound_file_path !== 'default') {
      // Delete old file
      await supabase.storage
        .from('sound-alerts')
        .remove([existingAlert.sound_file_path]);
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${alertType}_${Date.now()}.${fileExt}`;
    const filePath = `${alertType}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('sound-alerts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Create or update sound alert record
    const { data, error } = await supabase
      .from('sound_alerts')
      .upsert({
        alert_type: alertType,
        sound_file_path: filePath,
        sound_file_name: file.name,
        volume: volume,
        is_active: true,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'alert_type'
      })
      .select()
      .single();

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('sound-alerts')
      .getPublicUrl(filePath);

    return {
      ...data,
      public_url: urlData.publicUrl
    };
  },

  // Update sound alert (volume, active status)
  updateSoundAlert: async (alertType, updates) => {
    const { data, error } = await supabase
      .from('sound_alerts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('alert_type', alertType)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete sound alert and file (reset to default)
  deleteSoundAlert: async (alertType) => {
    // Get current sound alert to find file path
    const { data: currentAlert } = await supabase
      .from('sound_alerts')
      .select('sound_file_path')
      .eq('alert_type', alertType)
      .single();

    // Delete file from storage if exists
    if (currentAlert && currentAlert.sound_file_path && currentAlert.sound_file_path !== 'default') {
      await supabase.storage
        .from('sound-alerts')
        .remove([currentAlert.sound_file_path]);
    }

    // Reset to default (don't delete record, just reset to default)
    const { error } = await supabase
      .from('sound_alerts')
      .update({
        sound_file_path: 'default',
        sound_file_name: 'default',
        updated_at: new Date().toISOString()
      })
      .eq('alert_type', alertType)
      .select()
      .single();

    if (error) throw error;
    return { alert_type: alertType, sound_file_path: 'default' };
  },

  // Get public URL for sound file
  getSoundUrl: (filePath) => {
    if (!filePath || filePath === 'default') return null;
    const { data } = supabase.storage
      .from('sound-alerts')
      .getPublicUrl(filePath);
    return data?.publicUrl;
  }
};

