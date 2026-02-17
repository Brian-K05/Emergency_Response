# Emergency Response Platform
## Web-Based Platform for Information Dissemination and Emergency Response
### For 5 Selected Municipalities in the 1st District of Northern Samar

## 🚀 Quick Start

### Prerequisites
- Node.js and npm installed
- Supabase account (or use existing project)

### Setup Steps

1. **Database Setup (Supabase SQL Editor):**
   - Run `supabase/schema.sql` - Creates all database tables
   - Run `supabase/seed.sql` - Populates municipalities and barangays
   - Run `supabase/policies.sql` - Sets up Row Level Security (RLS) policies
   - Run `supabase/triggers.sql` - Sets up database triggers
   - Run `supabase/revised_teams_system.sql` - Creates teams system
   - Run `supabase/auto_assignment_by_incident_type.sql` - Auto assignment system
   - Run `supabase/sound_alerts_system.sql` - Sound alerts system
   - Run `supabase/storage_sound_alerts.sql` - Storage setup for sound alerts
   - Run `supabase/admin_user_creation_policies.sql` - Admin user creation policies
   - Run `supabase/notification_function.sql` - Notification functions
   - Run `supabase/fix_barangay_notifications.sql` - Fixes for barangay notifications
   - Run `supabase/fix_incidents_rls.sql` - Fixes for incidents RLS

2. **Create Storage Bucket:**
   - In Supabase Dashboard → Storage
   - Create bucket: `incident-media` (Public)

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Environment Variables:**
   - Create `frontend/.env` file with your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## 📁 Project Structure

```
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── context/      # React context
│   │   ├── lib/          # Library files
│   │   ├── styles/       # CSS styles
│   │   └── utils/         # Utility functions
│   └── package.json
│
├── supabase/              # Database SQL scripts
│   ├── schema.sql         # Database schema
│   ├── seed.sql           # Seed data
│   ├── policies.sql       # RLS policies
│   ├── triggers.sql       # Database triggers
│   └── ...                # Other SQL scripts
│
└── README.md              # This file
```

## ✨ Features

### Core Features
- ✅ **Internet-Based Reporting** - Works with ANY internet (WiFi OR mobile data)
- ✅ **Real-Time Incident Reporting** - Instant reporting via web platform
- ✅ **Automatic Notifications** - Barangay Officials + MDRRMO alerted simultaneously
- ✅ **Real-Time Sound Alerts** - Instant alerts for coordinators (role-based, residents excluded)
- ✅ **Live Dashboard Updates** - Real-time incident display with auto-refresh (1 second)

### Coordination & Tracking
- ✅ **Hierarchical Coordination** - Barangay first response, MDRRMO coordination
- ✅ **Auto Assignment** - Automatically assigns teams based on incident type
- ✅ **Incident Status Tracking** - Complete lifecycle: Reported → Assigned → In Progress → Resolved
- ✅ **Escalation System** - Barangay can escalate to MDRRMO when needed

### Management & Analytics
- ✅ **Role-Based Access Control** - 6 roles with different permissions
- ✅ **Response Teams Management** - Team-based assignments (no individual responder accounts)
- ✅ **Dashboard with Monthly Statistics** - Charts for trends, types, and status
- ✅ **Media Upload** - Photos/Videos attached to incidents
- ✅ **User Registration & Authentication** - Secure user management

## 👥 User Roles

The system focuses on **emergency incident response** with **6 essential roles**:

### System Administration
- **Super Administrator** - System-wide administration and configuration
- **Administrator** (Legacy) - Legacy administrative role

### Municipal Level
- **Municipal Administrator** - Municipal-level administration and emergency response oversight
- **MDRRMO Staff** - Emergency coordinator who monitors incidents and calls professional teams (fire, police, medical) directly

### Barangay Level
- **Barangay Official** - Barangay-level emergency response management and first response

### Community
- **Community Resident** - Reports emergencies via WiFi (when mobile signal unavailable)

**Key Design:** MDRRMO coordinates by calling professional response teams (firefighters, police, medical) directly via phone/radio, then updates the system. No individual responder accounts needed.

📖 **For detailed role descriptions, see [ROLES_AND_RESPONSIBILITIES.md](./ROLES_AND_RESPONSIBILITIES.md)**  
📋 **For problem statement and defense, see [PROBLEM_STATEMENT.md](./PROBLEM_STATEMENT.md)**

## 🛠️ Technology Stack

- **Frontend:** React.js
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Real-time)
- **Database:** PostgreSQL
- **Charts:** Recharts

## 📝 Important SQL Scripts

Run these scripts in order in Supabase SQL Editor:

1. `schema.sql` - Core database structure
2. `seed.sql` - Initial data (municipalities, barangays)
3. `policies.sql` - Security policies
4. `triggers.sql` - Database triggers
5. `revised_teams_system.sql` - Teams system
6. `auto_assignment_by_incident_type.sql` - Auto assignment
7. `sound_alerts_system.sql` - Sound alerts
8. `storage_sound_alerts.sql` - Storage setup
9. `admin_user_creation_policies.sql` - Admin policies
10. `notification_function.sql` - Notifications
11. `fix_barangay_notifications.sql` - Barangay fixes
12. `fix_incidents_rls.sql` - RLS fixes

## 🔧 Creating Admin Users

- **Super Admin:** Run `supabase/create_super_admin.sql`
- **Municipal Admins:** Run `supabase/create_municipal_admins.sql`

## 📞 Support

For issues or questions, refer to the SQL scripts comments or check the code documentation.
