/**
 * Role Utilities for Emergency Response System
 * Provides functions to work with user roles, permissions, and display names
 */

// Role display names mapping - Emergency Response Focus
// Note: No individual responder accounts - MDRRMO calls teams directly
export const ROLE_DISPLAY_NAMES = {
  super_admin: 'Super Administrator',
  municipal_admin: 'Municipal Administrator',
  mdrrmo: 'MDRRMO Staff',
  barangay_official: 'Barangay Official',
  admin: 'Administrator',
  resident: 'Community Resident',
};

// Role categories for organization
export const ROLE_CATEGORIES = {
  system: ['super_admin', 'admin'],
  municipal: ['municipal_admin', 'mdrrmo'],
  barangay: ['barangay_official'],
  community: ['resident'],
};

/**
 * Get display name for a role
 * @param {string} role - The role identifier
 * @returns {string} Display name for the role
 */
export const getRoleDisplayName = (role) => {
  return ROLE_DISPLAY_NAMES[role] || role || 'Unknown Role';
};

/**
 * Check if user has administrative privileges
 * @param {string} role - The role to check
 * @returns {boolean} True if role has admin privileges
 */
export const isAdminRole = (role) => {
  return [
    'super_admin',
    'municipal_admin',
    'admin',
  ].includes(role);
};

/**
 * Check if user can manage response teams
 * @param {string} role - The role to check
 * @returns {boolean} True if role can manage teams
 */
export const canManageTeams = (role) => {
  return [
    'super_admin',
    'municipal_admin',
    'admin',
    'mdrrmo',
    'barangay_official',
  ].includes(role);
};

/**
 * Check if user can assign incidents
 * @param {string} role - The role to check
 * @returns {boolean} True if role can assign incidents
 */
export const canAssignIncidents = (role) => {
  return [
    'super_admin',
    'municipal_admin',
    'admin',
    'mdrrmo',
    'barangay_official',
  ].includes(role);
};

/**
 * Check if user should receive sound alerts
 * @param {string} role - The role to check
 * @returns {boolean} True if role should receive sound alerts
 */
export const shouldReceiveSoundAlerts = (role) => {
  return [
    'super_admin',
    'municipal_admin',
    'admin',
    'mdrrmo',
    'barangay_official',
  ].includes(role);
};

/**
 * Check if user can update incident status
 * @param {string} role - The role to check
 * @returns {boolean} True if role can update incident status
 */
export const canUpdateIncidentStatus = (role) => {
  return [
    'super_admin',
    'municipal_admin',
    'admin',
    'mdrrmo',
    'barangay_official',
  ].includes(role);
};

/**
 * Check if user can view all incidents in municipality
 * @param {string} role - The role to check
 * @returns {boolean} True if role can view municipal incidents
 */
export const canViewMunicipalIncidents = (role) => {
  return [
    'super_admin',
    'municipal_admin',
    'admin',
    'mdrrmo',
  ].includes(role);
};

/**
 * Check if user can view all incidents in barangay
 * @param {string} role - The role to check
 * @returns {boolean} True if role can view barangay incidents
 */
export const canViewBarangayIncidents = (role) => {
  return [
    'super_admin',
    'municipal_admin',
    'admin',
    'mdrrmo',
    'barangay_official',
  ].includes(role);
};

/**
 * Get roles that can be created by a specific role
 * @param {string} creatorRole - The role of the user creating the account
 * @returns {Array} Array of role objects {value, label, category}
 * Note: No responder role - MDRRMO calls teams directly
 */
export const getCreatableRoles = (creatorRole) => {
  const emergencyRoles = [
    // Emergency Management
    { value: 'mdrrmo', label: 'MDRRMO Staff', category: 'municipal' },
    
    // Barangay
    { value: 'barangay_official', label: 'Barangay Official', category: 'barangay' },
    
    // Community
    { value: 'resident', label: 'Community Resident', category: 'community' },
  ];

  if (creatorRole === 'super_admin') {
    // Super admin can only create municipal_admin
    return [
      { value: 'municipal_admin', label: 'Municipal Administrator', category: 'municipal' },
    ];
  } else if (creatorRole === 'municipal_admin') {
    // Municipal admin can create emergency response roles
    return emergencyRoles;
  } else if (creatorRole === 'admin') {
    // Legacy admin can create emergency response roles
    return [
      ...emergencyRoles,
      { value: 'admin', label: 'Administrator', category: 'system' },
    ];
  }
  
  return [];
};

/**
 * Get role category
 * @param {string} role - The role identifier
 * @returns {string} Category name
 */
export const getRoleCategory = (role) => {
  for (const [category, roles] of Object.entries(ROLE_CATEGORIES)) {
    if (roles.includes(role)) {
      return category;
    }
  }
  return 'unknown';
};

/**
 * Get role hierarchy level (lower number = higher level)
 * @param {string} role - The role identifier
 * @returns {number} Hierarchy level
 */
export const getRoleHierarchyLevel = (role) => {
  const hierarchy = {
    super_admin: 1,
    municipal_admin: 2,
    admin: 2,
    mdrrmo: 3,
    barangay_official: 4,
    resident: 5,
  };
  return hierarchy[role] || 6;
};

/**
 * Check if role1 is higher than role2 in hierarchy
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} True if role1 is higher than role2
 */
export const isRoleHigher = (role1, role2) => {
  return getRoleHierarchyLevel(role1) < getRoleHierarchyLevel(role2);
};

