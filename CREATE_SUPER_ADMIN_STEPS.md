# Create Super Admin (when you have no users)

Do these in order.

---

## 1. Create the Auth user in Supabase

1. Open **Supabase Dashboard** → your project.
2. Go to **Authentication** → **Users**.
3. Click **Add user** → **Create new user**.
4. Fill in:
   - **Email:** e.g. `emergencyresponse488@gmail.com` (any email you control).
   - **Password:** choose a password (this is your **login password**).
   - Turn **Auto Confirm User** **ON**.
5. Click **Create user**.
6. On the Users list, find the new user and **copy the User UID** (the UUID, e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).

---

## 2. Add the Super Admin profile in the database

1. In Supabase go to **SQL Editor**.
2. Open **`supabase/CREATE_SUPER_ADMIN_NOW.sql`** from this project.
3. In that file, replace:
   - `YOUR_AUTH_USER_UUID_HERE` → paste the **User UID** you copied.
   - `your@email.com` → the **same email** you used in step 1.
   - Optionally set the phone or leave `NULL`.
4. Run the script (Run button).

You should see one row returned: your super admin.

---

## 3. Log in to the app

- **Email:** the one you used in step 1.  
- **Password:** the one you set in step 1.

You should land on the dashboard as **Super Administrator**.
