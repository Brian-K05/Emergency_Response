# Deploy Emergency Response Platform (Free)

Deploy the frontend so remote testers can access it **without localhost**. The backend (Supabase) is already in the cloud.

**Repository:** [https://github.com/Brian-K05/Emergency_Response](https://github.com/Brian-K05/Emergency_Response)

---

## Step 0: Push your code to GitHub (if the repo is empty)

If [Emergency_Response](https://github.com/Brian-K05/Emergency_Response) has no code yet, run these in your project folder (the folder that contains `frontend`, `supabase`, `README.md`, etc.):

```bash
git init
git add .
git commit -m "Initial commit - Emergency Response Platform"
git branch -M main
git remote add origin https://github.com/Brian-K05/Emergency_Response.git
git push -u origin main
```

If you already use Git and only need to add this remote:

```bash
git remote add origin https://github.com/Brian-K05/Emergency_Response.git
git push -u origin main
```

After this, your repo will have the code and you can deploy from Vercel.

---

## Recommended: Vercel (Free)

**Why Vercel:** Free tier, automatic HTTPS, works great with React, easy env vars. No credit card required.

### Option A: Deploy with Vercel (GitHub)

1. **Push your project to GitHub** (if not already)
   - Use **Step 0** above to push to `https://github.com/Brian-K05/Emergency_Response.git`
   - Ensure the repo contains the `frontend` folder (and `supabase`, `README.md`, etc.)

2. **Sign up at Vercel**
   - Go to https://vercel.com and sign up (use “Continue with GitHub”).

3. **Import the project**
   - Click **Add New…** → **Project**
   - Select **Brian-K05/Emergency_Response** (or paste repo URL), then **Import**
   - Set **Root Directory** to `frontend` (click “Edit”, type `frontend`, then Continue)

4. **Environment variables**
   - Before deploying, open **Settings** → **Environment Variables**
   - Add:
     - **Name:** `REACT_APP_SUPABASE_URL`  
       **Value:** your Supabase project URL (e.g. `https://xxxxx.supabase.co`)
     - **Name:** `REACT_APP_SUPABASE_ANON_KEY`  
       **Value:** your Supabase anon/public key
   - Get both from: Supabase Dashboard → Project Settings → API

5. **Deploy**
   - Click **Deploy**. Vercel will run `npm run build` in the `frontend` folder.
   - When done, you get a URL like `https://your-project.vercel.app`.

6. **Share with testers**
   - Send them the live URL (e.g. `https://your-project.vercel.app`). They use it like a normal website; no localhost.

---

### Option B: Deploy with Vercel (without GitHub – Vercel CLI)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **From your project folder (where `frontend` is)**
   ```bash
   cd frontend
   vercel
   ```
   - Log in when asked.
   - Link to existing project or create new one.
   - **Set up and deploy?** Yes.

3. **Add env vars**
   ```bash
   vercel env add REACT_APP_SUPABASE_URL
   vercel env add REACT_APP_SUPABASE_ANON_KEY
   ```
   Then redeploy:
   ```bash
   vercel --prod
   ```

4. **Root directory note:** If you run `vercel` from the repo root instead of `frontend`, in the Vercel dashboard set **Root Directory** to `frontend` and redeploy.

---

## Alternative: Netlify (Free)

1. Go to https://netlify.com and sign up.
2. **Add New Site** → **Import an existing project** (connect GitHub and select the repo).
3. Settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/build`
4. **Site settings** → **Environment variables**: add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`.
5. Deploy. Share the Netlify URL (e.g. `https://your-site.netlify.app`) with testers.

---

## After deployment

- **Supabase Auth (required for login):** In **Supabase Dashboard** → **Authentication** → **URL Configuration**:
  - **Site URL:** set to your deployed URL (e.g. `https://your-project.vercel.app`)
  - **Redirect URLs:** add `https://your-project.vercel.app/**` so login redirects work
- **Supabase:** No need to deploy backend; it’s already hosted. Keep RLS and triggers as you use them locally.
- **Testers:** Send them:
  1. The **live URL** (e.g. `https://your-project.vercel.app`)
  2. **TEST_CASES.md** or **TEST_CASES.csv** (they mark Pass/Fail and add notes)
  3. **FOR_TESTERS.md** (short “start here” instructions)
  4. Test accounts for each role (or tell them to Register + use Admin Create User where needed)

---

## Quick checklist

| Step | Done |
|------|------|
| Code pushed to GitHub (or use Vercel CLI) | ☐ |
| Vercel/Netlify project created, root = `frontend` | ☐ |
| `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` set | ☐ |
| Deploy successful, URL opens app | ☐ |
| Supabase Auth Site URL updated to deployed URL | ☐ |
| Testers have URL + test case document | ☐ |
