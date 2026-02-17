import { supabase } from '../lib/supabase';

export const teamsService = {
  // Get all teams for a municipality
  getTeams: async (municipalityId = null, barangayId = null) => {
    let query = supabase
      .from('response_teams')
      .select(`
        *,
        monitor:users!monitor_user_id(id, full_name, email, phone_number)
      `)
      .eq('is_active', true)
      .order('name');

    if (municipalityId) {
      query = query.eq('municipality_id', municipalityId);
    }
    if (barangayId) {
      query = query.eq('barangay_id', barangayId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get barangay teams for a barangay
  getBarangayTeams: async (barangayId) => {
    const { data, error } = await supabase
      .from('response_teams')
      .select(`
        *,
        monitor:users!monitor_user_id(id, full_name, email, phone_number)
      `)
      .eq('barangay_id', barangayId)
      .eq('team_type', 'barangay_team')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Get municipal teams for a municipality
  getMunicipalTeams: async (municipalityId) => {
    const { data, error } = await supabase
      .from('response_teams')
      .select(`
        *,
        monitor:users!monitor_user_id(id, full_name, email, phone_number)
      `)
      .eq('municipality_id', municipalityId)
      .in('team_type', ['municipal_mdrrmo', 'municipal_responder'])
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Get team details
  getTeam: async (teamId) => {
    const { data, error } = await supabase
      .from('response_teams')
      .select(`
        *,
        monitor:users!monitor_user_id(id, full_name, email, phone_number, role)
      `)
      .eq('id', teamId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create team (one account per team)
  createTeam: async (teamData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('response_teams')
      .insert({
        ...teamData,
      })
      .select(`
        *,
        monitor:users!monitor_user_id(id, full_name, email, phone_number)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Update team
  updateTeam: async (teamId, teamData) => {
    const { data, error } = await supabase
      .from('response_teams')
      .update(teamData)
      .eq('id', teamId)
      .select(`
        *,
        monitor:users!monitor_user_id(id, full_name, email, phone_number)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Get teams available for assignment (municipal teams only - for manual assignment)
  getTeamsForAssignment: async (municipalityId) => {
    const { data, error } = await supabase
      .from('response_teams')
      .select(`
        *,
        monitor:users!monitor_user_id(id, full_name, email, phone_number)
      `)
      .eq('is_active', true)
      .eq('municipality_id', municipalityId)
      .in('team_type', ['municipal_mdrrmo', 'municipal_responder']);

    if (error) throw error;
    return data || [];
  },
};

