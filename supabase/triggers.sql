-- Database Triggers for Emergency Response Platform
-- This creates a trigger to automatically create a user profile when auth user is created

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by the trigger
  -- The actual profile creation will be done by the application
  -- This is just a placeholder for future use if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We're not using a trigger for automatic profile creation
-- because we need the username and other data from the registration form
-- The application will handle profile creation after auth signup

-- However, if you want automatic profile creation with just email,
-- you could use this trigger (but it won't have username, full_name, etc.):

/*
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
*/

