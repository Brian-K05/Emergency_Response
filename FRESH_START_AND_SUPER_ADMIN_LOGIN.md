# Fresh Database + Super Admin Login

Follow these steps to start with a clean database (no other users, no reports) and log in again as **Super Admin** after resetting your password.

---

## Step 1: Reset the database (clear reports and user profiles)

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Open the file **`supabase/RESET_DATABASE_FRESH.sql`** from this project.
3. Copy its contents into the SQL Editor (only the part that runs – the `DELETE` and optional `INSERT` at the end are separate; see file comments).
4. Run the script (the `DELETE` statements).  
   This will:
   - Delete all incident media, updates, notifications, escalations, assignments, and incidents.
   - Delete all rows in `public.users` (so no municipal admin, barangay official, or resident profiles).

Your **Auth users** (email/password) are **not** deleted; only their **profiles** in `public.users` are removed.

---

## Step 2: Reset Super Admin password

1. In Supabase go to **Authentication** → **Users**.
2. Find the user you use as Super Admin (e.g. `emergencyresponse488@gmail.com`).
3. Click the **three dots (•••)** on that row.
4. Choose one:
   - **Update user**  
     Set a **new password** in the form, then save. Use this password to log in.
   - **Send password recovery**  
     Supabase will email a reset link; open it and set a new password.

Remember the new password; you’ll use it to log in to the app.

---

## Step 3: Get the Super Admin UUID

1. Still in **Authentication** → **Users**, open the same Super Admin user.
2. Copy the **User UID** (it looks like `27564027-3655-4f74-a11f-02d44556547e`).  
   You need this for the next step.

---

## Step 4: Re-add the Super Admin profile

1. Go back to **SQL Editor**.
2. Open **`supabase/READD_SUPER_ADMIN_AFTER_RESET.sql`**.
3. In that file, **replace** `'27564027-3655-4f74-a11f-02d44556547e'` with the **User UID** you copied in Step 3.  
   If your Super Admin email is not `emergencyresponse488@gmail.com`, change that in the `INSERT` too.
4. Run the script.

You should see one row returned for the super admin. That user now has a **Super Administrator** profile again.

---

## Step 5: Log in to the app

1. Open your app (local or deployed URL).
2. Log in with:
   - **Email:** the Super Admin email (e.g. `emergencyresponse488@gmail.com`)
   - **Password:** the new password you set in Step 2

You should land on the dashboard as Super Admin. You can create municipal admins, barangay officials, and residents from there.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Run `RESET_DATABASE_FRESH.sql` (the DELETE part) in SQL Editor |
| 2 | Authentication → Users → Super Admin → Update user → set new password |
| 3 | Copy that user’s **User UID** |
| 4 | Run `READD_SUPER_ADMIN_AFTER_RESET.sql` with that UUID (and correct email if needed) |
| 5 | Log in to the app with that email and the new password |

If you don’t see your Super Admin in **Authentication → Users**, create a new user there with the desired email and password, then use that new user’s **User UID** in **READD_SUPER_ADMIN_AFTER_RESET.sql** (and put the same email in the `INSERT`).
