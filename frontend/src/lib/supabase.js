import { createClient } from '@supabase/supabase-js';

// TEMPORARY: Hardcoded values for immediate fix
// TODO: Use environment variables after restarting React server
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://oaggqopgpanplgbjjqnh.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZ2dxb3BncGFucGxnYmpqcW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjU0NDEsImV4cCI6MjA4NTEwMTQ0MX0.abcn-Vb6uJk0YzU3ZH1046gALqU4jkUPUazc26DVYOo';

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `
    ⚠️ MISSING SUPABASE ENVIRONMENT VARIABLES ⚠️
    
    Please create a .env file in the frontend/ folder with:
    
    REACT_APP_SUPABASE_URL=https://oaggqopgpanplgbjjqnh.supabase.co
    REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZ2dxb3BncGFucGxnYmpqcW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjU0NDEsImV4cCI6MjA4NTEwMTQ0MX0.abcn-Vb6uJk0YzU3ZH1046gALqU4jkUPUazc26DVYOo
    
    Then RESTART your React server (Ctrl+C, then npm start)
    
    See frontend/CREATE_ENV_NOW.txt for detailed instructions.
  `;
  console.error(errorMessage);
  throw new Error('Missing Supabase environment variables - See console for instructions');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    // Add timeout for auth check too
    const authPromise = supabase.auth.getUser();
    const authTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth check timeout')), 2000)
    );
    
    const { data: { user }, error: authError } = await Promise.race([authPromise, authTimeout]);
    
    if (!user || authError) {
      return null;
    }

    // Get user profile from public.users table with timeout
    // If profile doesn't exist or query fails, return auth user with basic info
    let profile = null;
    let profileError = null;
    try {
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // Add timeout to prevent hanging (2 seconds for profile fetch)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
      );

      const result = await Promise.race([profilePromise, timeoutPromise]);
      profile = result?.data;
      profileError = result?.error;
    } catch (error) {
      // Timeout or other error - continue with auth user only
      // Don't log timeout as error, it's expected if profile doesn't exist
      if (!error.message?.includes('timeout')) {
        console.warn('Profile fetch failed:', error);
      }
      profileError = error;
      profile = null;
    }

    // If profile exists and no error, merge it with auth user
    if (profile && !profileError) {
      return { ...user, ...profile };
    }

    // If profile fetch failed, try one more time with a longer timeout
    // This helps with race conditions or slow database queries
    if (profileError && !profileError.code === 'PGRST116') {
      console.log('Profile fetch failed, retrying...', profileError);
      try {
        const retryPromise = supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        const retryTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout (retry)')), 3000)
        );
        
        const retryResult = await Promise.race([retryPromise, retryTimeout]);
        const retryProfile = retryResult?.data;
        const retryError = retryResult?.error;
        
        if (retryProfile && !retryError) {
          console.log('Profile fetch succeeded on retry');
          return { ...user, ...retryProfile };
        }
      } catch (retryErr) {
        console.warn('Profile retry also failed:', retryErr);
      }
    }

    // If profile doesn't exist (PGRST116 = no rows returned), return minimal user object
    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist in database - return minimal user object
      return {
        ...user,
        email: user.email,
        username: user.user_metadata?.username || user.email?.split('@')[0],
        full_name: user.user_metadata?.full_name || '',
        role: 'resident', // Default role
        // phone_number and municipality_id are missing - profile incomplete
      };
    }
    
    // If profile fetch failed for other reasons (timeout, network, etc.)
    // Try one more direct query without timeout to get the profile
    // This is important because we need the profile data
    console.warn('Profile fetch failed, trying direct query without timeout...', profileError);
    try {
      const directQuery = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (directQuery.data && !directQuery.error) {
        console.log('Direct query succeeded, returning profile');
        return { ...user, ...directQuery.data };
      }
    } catch (directError) {
      console.warn('Direct query also failed:', directError);
    }
    
    // If all attempts failed, return null to indicate we couldn't get the profile
    // This prevents using an incomplete user object that would cause redirect loops
    console.warn('All profile fetch attempts failed, returning null');
    return null;
  } catch (error) {
    // Don't log timeout errors as they're expected
    if (!error.message?.includes('timeout')) {
      console.error('Error in getCurrentUser:', error);
    }
    // Return null on any error to prevent hanging
    return null;
  }
};

// Helper function to sign up
export const signUp = async (email, password, userData) => {
  // First, sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: userData.username,
        full_name: userData.full_name,
      }
    }
  });

  if (authError) {
    console.error('Auth signup error:', authError);
    
    // Handle rate limit errors specifically
    if (authError.status === 429 || authError.message?.includes('rate limit')) {
      const rateLimitError = new Error('Too many registration attempts. Please wait a few minutes before trying again.');
      rateLimitError.name = 'RateLimitError';
      rateLimitError.status = 429;
      throw rateLimitError;
    }
    
    // Handle other auth errors
    if (authError.message) {
      const error = new Error(authError.message);
      error.name = authError.name || 'AuthError';
      error.status = authError.status;
      throw error;
    }
    
    throw authError;
  }
  
  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  // Check if we have a session (email confirmation might be required)
  if (!authData.session) {
    // If no session, user needs to confirm email first
    // But we can still try to create the profile
    console.warn('No session after signup - email confirmation may be required');
  }

  // Try to create profile using direct insert first
  // If that fails due to RLS, we'll try the function approach
  const insertData = {
    id: authData.user.id,
    username: userData.username,
    email: email,
    full_name: userData.full_name,
    role: userData.role || 'resident', // Always resident for public registration
    // Other fields (phone_number, municipality_id, etc.) will be filled in account setup
  };

  console.log('Attempting to insert user profile:', { ...insertData, id: insertData.id });

  let profileData, profileError;
  
  // First, try direct insert
  const insertResult = await supabase
    .from('users')
    .insert(insertData)
    .select()
    .single();
  
  profileData = insertResult.data;
  profileError = insertResult.error;

  // If direct insert fails, try using the database function
  if (profileError && profileError.code === '42501') {
    console.log('Direct insert failed, trying database function...');
    const functionResult = await supabase.rpc('create_user_profile', {
      user_id: authData.user.id,
      user_username: userData.username,
      user_email: email,
      user_full_name: userData.full_name,
      user_role: userData.role || 'resident'
    });
    
    if (functionResult.data) {
      profileData = functionResult.data;
      profileError = null;
    } else {
      profileError = functionResult.error;
    }
  }

  if (profileError) {
    // Log detailed error information
    console.error('Profile creation failed:', {
      error: profileError,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
      code: profileError.code,
      userData: insertData,
      authUserId: authData.user.id,
      hasSession: !!authData.session,
    });
    
    // Provide more helpful error message
    let errorMessage = 'Failed to create user profile. ';
    if (profileError.code === '23505') {
      errorMessage += 'Username or email already exists. Please try a different username or email.';
    } else if (profileError.code === '23503') {
      errorMessage += 'Invalid reference data. Please contact support.';
    } else if (profileError.code === '42501') {
      errorMessage += 'Permission denied. Please contact support.';
    } else if (profileError.message) {
      errorMessage += profileError.message;
    } else {
      errorMessage += 'Please try again or contact support.';
    }
    
    throw new Error(errorMessage);
  }

  return { user: profileData, session: authData.session };
};

// Helper function to sign in
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in error:', error);
    
    // Provide user-friendly error messages
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials and try again.');
    } else if (error.message?.includes('Email not confirmed')) {
      throw new Error('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
    } else if (error.message) {
      throw new Error(error.message);
    }
    
    throw error;
  }

  if (!data.user) {
    throw new Error('Login failed. Please try again.');
  }

  // Get user profile (will work even if profile is incomplete or fetch fails)
  // Don't let profile fetch failure block login
  let profile;
  try {
    profile = await getCurrentUser();
  } catch (profileError) {
    console.warn('Profile fetch failed during login, continuing with auth user:', profileError);
    // Continue with auth user only
    profile = null;
  }

  return {
    user: profile || {
      ...data.user,
      email: data.user.email,
      username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
      full_name: data.user.user_metadata?.full_name || '',
      role: 'resident',
    },
    session: data.session,
  };
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

