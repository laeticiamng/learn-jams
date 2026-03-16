-- Set admin metadata for the main user account
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin", "is_admin": true}'::jsonb
WHERE email = 'm.laeticia@hotmail.fr';
