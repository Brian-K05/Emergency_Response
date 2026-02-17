import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, signIn, signUp, signOut, getCurrentUser } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Cache the last successfully fetched profile to prevent losing it on re-renders
  const profileCacheRef = useRef(null);

  useEffect(() => {
    // Check if user is already logged in
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          try {
            // Try to get profile with timeout
            const profilePromise = getCurrentUser();
            const timeoutPromise = new Promise((resolve) => 
              setTimeout(() => resolve(null), 2000)
            );
            const profile = await Promise.race([profilePromise, timeoutPromise]);
            
            if (profile) {
              // Cache if it has a role (important for super_admin, municipal_admin, etc.)
              // Super admins don't have municipality_id, so we check for role instead
              if (profile.role) {
                profileCacheRef.current = profile;
                console.log('✅ Cached profile with role from auth state change:', profile.role);
              }
              setUser(profile);
            } else {
              // Check cache before using session user
              if (profileCacheRef.current && profileCacheRef.current.role) {
                console.log('✅ Using cached profile with role from auth state change:', profileCacheRef.current.role);
                setUser(profileCacheRef.current);
              } else {
                // Use session user if profile fetch fails and no cache
                setUser({
                  ...session.user,
                  email: session.user.email,
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
                  full_name: session.user.user_metadata?.full_name || '',
                  role: 'resident',
                });
              }
            }
            setIsAuthenticated(true);
          } catch (error) {
            console.error('Error getting user profile in auth state change:', error);
            // Still set authenticated if we have a session
            setUser({
              ...session.user,
              email: session.user.email,
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
              full_name: session.user.user_metadata?.full_name || '',
              role: 'resident',
            });
            setIsAuthenticated(true);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    // Set a maximum timeout to ensure loading always resolves
    const maxTimeout = setTimeout(() => {
      console.warn('Auth check taking too long, forcing completion');
      setLoading(false);
    }, 5000); // 5 second maximum

    try {
      // First, quickly check if we have a session (this is fast)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session || sessionError) {
        // No session, user is not authenticated
        setUser(null);
        setIsAuthenticated(false);
        clearTimeout(maxTimeout);
        setLoading(false);
        return;
      }

      // We have a session, now try to get full profile (with timeout)
      try {
        const profilePromise = getCurrentUser();
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve(null), 3000) // 3 second timeout for profile
        );
        
        const profile = await Promise.race([profilePromise, timeoutPromise]);
        
        if (profile) {
          // Cache the profile if it has a role (important for super_admin and municipal_admin)
          // For super_admin, municipality_id might be null, so we check for role instead
          if (profile.role) {
            profileCacheRef.current = profile;
            console.log('✅ Cached profile with role:', profile.role);
          }
          setUser(profile);
          setIsAuthenticated(true);
        } else {
          // Profile fetch timed out - retry with getCurrentUser which has better retry logic
          console.log('Initial profile fetch timed out, retrying with getCurrentUser...');
          try {
            const retryProfile = await getCurrentUser();
            if (retryProfile && retryProfile.role) {
              // Got profile with role on retry - cache and use it
              console.log('✅ Retry succeeded with profile role:', retryProfile.role);
              profileCacheRef.current = retryProfile;
              setUser(retryProfile);
              setIsAuthenticated(true);
            } else if (retryProfile) {
              // Got profile but it's incomplete - ALWAYS check cache first
              if (profileCacheRef.current && profileCacheRef.current.role) {
                console.log('✅ Using cached profile with role instead of incomplete one:', profileCacheRef.current.role);
                setUser(profileCacheRef.current);
                setIsAuthenticated(true);
              } else {
                console.warn('⚠️ Retry succeeded but profile is incomplete, no cache available');
                setUser(retryProfile);
                setIsAuthenticated(true);
              }
            } else {
              // Still failed - ALWAYS use cache if available
              if (profileCacheRef.current && profileCacheRef.current.role) {
                console.log('✅ Using cached profile with role after fetch failure:', profileCacheRef.current.role);
                setUser(profileCacheRef.current);
                setIsAuthenticated(true);
              } else {
                // No cache available - use minimal user object
                console.warn('⚠️ Profile fetch failed after retry - user may need to complete setup');
                setUser({
                  ...session.user,
                  email: session.user.email,
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
                  full_name: session.user.user_metadata?.full_name || '',
                  role: 'resident',
                });
                setIsAuthenticated(true);
              }
            }
          } catch (retryError) {
            console.error('Retry also failed:', retryError);
            // Retry also failed - use session user
            setUser({
              ...session.user,
              email: session.user.email,
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
              full_name: session.user.user_metadata?.full_name || '',
              role: 'resident',
            });
            setIsAuthenticated(true);
          }
        }
      } catch (profileError) {
        // Profile fetch failed, try to use cached profile first
        console.warn('Profile fetch failed, checking cache:', profileError);
        if (profileCacheRef.current && profileCacheRef.current.role) {
          console.log('✅ Using cached profile after fetch failure');
          setUser(profileCacheRef.current);
          setIsAuthenticated(true);
        } else {
          // Only use default 'resident' role if we truly have no profile data
          console.warn('No cached profile, using session user with default role');
          setUser({
            ...session.user,
            email: session.user.email,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
            full_name: session.user.user_metadata?.full_name || '',
            role: 'resident',
          });
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // On any error, assume not authenticated
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      clearTimeout(maxTimeout);
      // Always set loading to false
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true); // Set loading during login
      const data = await signIn(email, password);
      // Cache the profile if it has a role (important for super_admin, municipal_admin, etc.)
      if (data.user && data.user.role) {
        profileCacheRef.current = data.user;
        console.log('✅ Cached profile with role after login:', data.user.role);
      }
      setUser(data.user);
      setIsAuthenticated(true);
      setLoading(false); // Clear loading on success
      return data;
    } catch (error) {
      setLoading(false); // Clear loading on error
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const data = await signUp(userData.email, userData.password, userData);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = async (userData) => {
    // Clear cache when updating user
    profileCacheRef.current = null;
    try {
      if (!user || !user.id) throw new Error('User not authenticated');
      
      // Clean the data - remove undefined values and ensure proper types
      const cleanData = {};
      Object.keys(userData).forEach(key => {
        const value = userData[key];
        // Only include defined values (not undefined)
        if (value !== undefined) {
          // Convert empty strings to null for optional fields
          if (value === '' && key !== 'phone_number' && key !== 'municipality_id') {
            cleanData[key] = null;
          } else {
            cleanData[key] = value;
          }
        }
      });

      console.log('Updating user profile:', { userId: user.id, data: cleanData });

      const { data, error } = await supabase
        .from('users')
        .update(cleanData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        // Provide more detailed error message
        if (error.code === '23505') {
          throw new Error('A user with this information already exists.');
        } else if (error.code === '23503') {
          throw new Error('Invalid municipality or barangay selected. Please try again.');
        } else if (error.message) {
          throw new Error(`Update failed: ${error.message}`);
        }
        throw error;
      }

      if (!data) {
        throw new Error('Update succeeded but no data returned.');
      }

      // Update user state immediately with the fresh data from database
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      
      // Cache the updated profile if it has a role (important for super_admin, municipal_admin, etc.)
      if (updatedUser.role) {
        profileCacheRef.current = updatedUser;
        console.log('✅ Cached updated profile with role:', updatedUser.role);
      }
      
      // Force a refresh of the user profile to ensure we have the latest data
      // This helps prevent stale data issues
      setTimeout(async () => {
        try {
          const freshProfile = await getCurrentUser();
          if (freshProfile && freshProfile.role) {
            // Only update if we got a profile with a role (prevents overwriting super_admin with wrong data)
            // Cache if it has a role
            profileCacheRef.current = freshProfile;
            console.log('✅ Refreshed and cached profile with role:', freshProfile.role);
            setUser(freshProfile);
          } else if (freshProfile) {
            // Got profile but no role - check cache first
            if (profileCacheRef.current && profileCacheRef.current.role) {
              console.log('⚠️ Fresh profile has no role, keeping cached profile with role:', profileCacheRef.current.role);
              // Don't overwrite with incomplete profile
            } else {
              setUser(freshProfile);
            }
          }
        } catch (err) {
          console.warn('Could not refresh user profile after update:', err);
          // Keep the updated user we already set
        }
      }, 500);
      
      // Return the updated user object
      return updatedUser;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  };

  // Function to refresh user profile
  const refreshUser = async () => {
    try {
      console.log('Refreshing user profile...');
      const profile = await getCurrentUser();
      if (profile && profile.role) {
        // Only update if we got a profile with a role (prevents overwriting super_admin with wrong data)
        console.log('User profile refreshed:', { 
          id: profile.id, 
          role: profile.role,
          hasPhone: !!profile.phone_number, 
          hasMunicipality: !!profile.municipality_id 
        });
        // Cache the profile if it has a role
        profileCacheRef.current = profile;
        setUser(profile);
        setIsAuthenticated(true);
        return profile;
      } else if (profile) {
        // Got profile but no role - check cache first
        if (profileCacheRef.current && profileCacheRef.current.role) {
          console.log('⚠️ Refreshed profile has no role, keeping cached profile with role:', profileCacheRef.current.role);
          // Don't overwrite with incomplete profile - return cached one
          return profileCacheRef.current;
        } else {
          // No cache, use the incomplete profile
          setUser(profile);
          setIsAuthenticated(true);
          return profile;
        }
      } else {
        // No profile returned - check cache
        if (profileCacheRef.current && profileCacheRef.current.role) {
          console.log('⚠️ No profile returned from refresh, using cached profile with role:', profileCacheRef.current.role);
          setUser(profileCacheRef.current);
          setIsAuthenticated(true);
          return profileCacheRef.current;
        }
        console.warn('No profile returned from getCurrentUser and no cache available');
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // On error, check cache
      if (profileCacheRef.current && profileCacheRef.current.role) {
        console.log('⚠️ Error refreshing profile, using cached profile with role:', profileCacheRef.current.role);
        setUser(profileCacheRef.current);
        setIsAuthenticated(true);
        return profileCacheRef.current;
      }
    }
    return null;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

