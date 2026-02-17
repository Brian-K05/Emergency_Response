import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading, refreshUser } = useAuth();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(false);
  const lastCompleteProfileRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  // Check if profile setup is complete (required fields: phone_number and municipality_id)
  // Super admin doesn't need municipality_id, only phone_number
  const isAccountSetupPage = location.pathname === '/account/setup';
  const isSuperAdmin = user?.role === 'super_admin';
  
  // More robust check - ensure values are not just truthy but actually exist
  const hasPhoneNumber = user?.phone_number && 
    (typeof user.phone_number === 'string' ? user.phone_number.trim() !== '' : user.phone_number);
  
  const hasMunicipality = user?.municipality_id && 
    (typeof user.municipality_id === 'number' ? user.municipality_id > 0 : 
     typeof user.municipality_id === 'string' ? user.municipality_id.trim() !== '' : false);
  
  // Super admin only needs phone_number, regular users need both phone_number and municipality_id
  const isProfileComplete = isSuperAdmin 
    ? hasPhoneNumber 
    : (hasPhoneNumber && hasMunicipality);

  // If profile appears incomplete, check if we have a cached complete profile
  // This prevents redirect loops when profile fetch temporarily fails
  // For super admin, only check phone_number; for others, check both
  const cachedIsSuperAdmin = lastCompleteProfileRef.current?.role === 'super_admin';
  const hasCachedCompleteProfile = cachedIsSuperAdmin
    ? lastCompleteProfileRef.current?.phone_number
    : (lastCompleteProfileRef.current?.phone_number && lastCompleteProfileRef.current?.municipality_id);

  // Use cached profile if current user object is incomplete but we have a cached one
  const effectiveUser = (!isProfileComplete && hasCachedCompleteProfile) 
    ? lastCompleteProfileRef.current 
    : user;
  
  const effectiveIsSuperAdmin = effectiveUser?.role === 'super_admin';
  const effectiveHasPhone = effectiveUser?.phone_number &&
    (typeof effectiveUser.phone_number === 'string' ? effectiveUser.phone_number.trim() !== '' : effectiveUser.phone_number);
  const effectiveHasMunicipality = effectiveUser?.municipality_id &&
    (typeof effectiveUser.municipality_id === 'number' ? effectiveUser.municipality_id > 0 : 
     typeof effectiveUser.municipality_id === 'string' ? effectiveUser.municipality_id.trim() !== '' : false);
  const effectiveIsComplete = effectiveIsSuperAdmin
    ? effectiveHasPhone
    : (effectiveHasPhone && effectiveHasMunicipality);

  // Only redirect if profile is truly incomplete AND we don't have a cached complete profile
  // AND we're not currently checking/refreshing the profile
  const shouldRedirect = !isAccountSetupPage && 
    !effectiveIsComplete && 
    !hasCachedCompleteProfile && 
    user && 
    !checkingProfile;

  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY RETURNS
  // Track the last complete profile we saw
  useEffect(() => {
    const userIsSuperAdmin = user?.role === 'super_admin';
    const userHasPhone = user?.phone_number && 
      (typeof user.phone_number === 'string' ? user.phone_number.trim() !== '' : user.phone_number);
    const userHasMunicipality = user?.municipality_id &&
      (typeof user.municipality_id === 'number' ? user.municipality_id > 0 : 
       typeof user.municipality_id === 'string' ? user.municipality_id.trim() !== '' : false);
    
    if (userIsSuperAdmin ? userHasPhone : (userHasPhone && userHasMunicipality)) {
      lastCompleteProfileRef.current = user;
    }
  }, [user]);

  // If profile is incomplete but we have a cached complete profile, try to refresh
  useEffect(() => {
    if (!isAccountSetupPage && !isProfileComplete && hasCachedCompleteProfile && !checkingProfile && refreshUser) {
      setCheckingProfile(true);
      // Try refreshing the profile once
      refreshUser().finally(() => {
        setCheckingProfile(false);
      });
    }
  }, [isProfileComplete, hasCachedCompleteProfile, isAccountSetupPage, checkingProfile, refreshUser]);

  // Handle redirect with delay to prevent race conditions
  useEffect(() => {
    if (shouldRedirect) {
      // Clear any existing timeout
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      
      // Wait 2 seconds before redirecting to give profile refresh a chance
      redirectTimeoutRef.current = setTimeout(() => {
        console.log('Redirecting to account setup after delay');
        // Force a final refresh before redirecting
        if (refreshUser) {
          refreshUser().then((refreshed) => {
            const refreshedIsSuperAdmin = refreshed?.role === 'super_admin';
            const refreshedHasPhone = refreshed?.phone_number && 
              (typeof refreshed.phone_number === 'string' ? refreshed.phone_number.trim() !== '' : refreshed.phone_number);
            const refreshedHasMunicipality = refreshed?.municipality_id &&
              (typeof refreshed.municipality_id === 'number' ? refreshed.municipality_id > 0 : 
               typeof refreshed.municipality_id === 'string' ? refreshed.municipality_id.trim() !== '' : false);
            
            const refreshedIsComplete = refreshedIsSuperAdmin
              ? refreshedHasPhone
              : (refreshedHasPhone && refreshedHasMunicipality);
            
            if (!refreshedIsComplete) {
              window.location.href = '/account/setup';
            }
          }).catch(() => {
            window.location.href = '/account/setup';
          });
        } else {
          window.location.href = '/account/setup';
        }
      }, 2000);
    } else {
      // Clear timeout if we shouldn't redirect
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [shouldRedirect, refreshUser]);

  // Debug logging
  if (isAuthenticated && user && !isAccountSetupPage) {
    console.log('🔒 ProtectedRoute Check:', {
      path: location.pathname,
      role: user.role,
      isSuperAdmin: isSuperAdmin,
      hasPhone: hasPhoneNumber,
      hasMunicipality: hasMunicipality,
      isComplete: isProfileComplete,
      hasCached: hasCachedCompleteProfile,
      effectiveComplete: effectiveIsComplete,
      checkingProfile: checkingProfile,
      shouldRedirect: shouldRedirect,
    });
  }

  // Show loading only if we're still checking authentication
  if (loading) {
    return (
      <div className="loading" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(4, 70, 167, 0.2)',
          borderTopColor: '#0446A7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading while checking profile
  if (checkingProfile) {
    return (
      <div className="loading" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(4, 70, 167, 0.2)',
          borderTopColor: '#0446A7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Verifying profile...</p>
      </div>
    );
  }

  // If we should redirect, show loading while waiting
  if (shouldRedirect) {
    return (
      <div className="loading" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(4, 70, 167, 0.2)',
          borderTopColor: '#0446A7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Verifying profile...</p>
      </div>
    );
  }

  // If user is null but authenticated, might need setup (unless super admin)
  if (!isAccountSetupPage && !user && isAuthenticated) {
    // Don't redirect super admin to setup if we can't get user data
    // They should be able to access the system
    return <Navigate to="/dashboard" replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(effectiveUser?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
