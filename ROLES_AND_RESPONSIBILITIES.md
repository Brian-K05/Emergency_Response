# Emergency Response System - Roles and Responsibilities

This document outlines all user roles in the Emergency Response Platform, their purposes, permissions, and responsibilities focused on **emergency incident response**.

## Problem Context

**Key Issue:** Remote barangays often have **NO mobile signal** (Smart, Globe, TNT) for making emergency calls. They use **WiFi internet** (when electricity available) OR **mobile data** to access the web. This system enables internet-based reporting (WiFi OR mobile data), with MDRRMO coordinating and calling professional response teams (fire, police, medical) directly.

## Role Hierarchy

```
super_admin (Highest Level)
    ↓
municipal_admin
    ↓
mdrrmo (Emergency Coordinator - Calls Teams Directly)
    ↓
barangay_official (First Response)
    ↓
admin (Legacy)
    ↓
resident (Reports Emergencies via Internet - WiFi OR Mobile Data)
```

---

## 1. **super_admin** (Super Administrator)
**Purpose:** System-wide administration and configuration

**Responsibilities:**
- Manage system-wide settings and configurations
- Create and manage municipal administrators
- Oversee all municipalities and barangays
- Access all system data and reports
- Manage system users across all municipalities
- Configure system-wide policies and rules
- View comprehensive analytics and statistics

**Permissions:**
- Full access to all features and data
- Can create municipal_admin accounts
- Can view all incidents, users, and reports across all municipalities
- Can manage response teams system-wide
- Can configure sound alerts and notifications
- Can access map view of all incidents
- Receives real-time sound alerts for all incidents

**Use Case:** System administrators, platform managers, or provincial emergency management office.

---

## 2. **municipal_admin** (Municipal Administrator)
**Purpose:** Municipal-level administration and emergency response oversight

**Responsibilities:**
- Manage all emergency operations within their municipality
- Create and manage user accounts (barangay officials, MDRRMO staff)
- Oversee all barangays within their municipality
- Monitor and coordinate municipal-wide emergency responses
- View and analyze municipal statistics and reports
- Manage response teams within the municipality
- Coordinate with barangay officials and MDRRMO

**Permissions:**
- Full access within their municipality
- Can create: resident, barangay_official, mdrrmo accounts
- Can view all incidents in their municipality
- Can view statistics for all barangays in their municipality
- Can manage response teams in their municipality
- Can access map view of municipal incidents
- Receives real-time sound alerts for incidents in their municipality

**Use Case:** Municipal administrator, municipal secretary, or designated municipal emergency management coordinator.

---

## 3. **mdrrmo** (Municipal Disaster Risk Reduction and Management Office)
**Purpose:** Emergency response coordination - **Calls professional teams directly**

**Responsibilities:**
- **Monitor all incidents** in their municipality via the platform
- **Coordinate emergency response** - calls fire department, police, medical teams directly (phone/radio)
- **Update incident status** in system based on team reports
- Manage response teams (for tracking purposes)
- Coordinate with barangay officials
- Escalate incidents when barangay requests assistance
- Track response progress and update system
- Provide technical expertise in disaster response

**Key Workflow:**
1. Receives alert for new incident (e.g., fire)
2. Reviews incident details in dashboard
3. **Calls Fire Department directly** (outside system - phone/radio)
4. Updates system: "Fire Department dispatched"
5. Monitors progress and updates: "In Progress" → "Resolved"

**Permissions:**
- Can view all incidents in their municipality
- Can assign incidents to response teams (for tracking)
- Can update incident status
- Can create and manage response teams
- Can view municipal statistics
- Receives real-time sound alerts for incidents
- Can access map view of municipal incidents
- Can request assistance and escalate incidents

**Use Case:** MDRRMO staff member who coordinates emergency responses. Has better connectivity (landline/signal) to call professional teams directly.

**Important:** MDRRMO does NOT need individual responder accounts. They coordinate by calling teams directly (fire, police, medical) and update the system accordingly.

---

## 4. **barangay_official** (Barangay Official)
**Purpose:** Barangay-level emergency response management and first response

**Responsibilities:**
- Manage day-to-day barangay emergency operations
- Monitor and respond to incidents in their barangay
- **Attempt first response** for incidents within barangay capability
- Update incident status and provide updates
- **Request escalation** to MDRRMO when barangay cannot handle
- Notify residents about emergencies
- Access barangay statistics and reports

**Key Workflow:**
1. Receives alert for new incident in their barangay
2. Reviews incident and attempts first response if capable
3. If incident too large/complex → **Requests escalation to MDRRMO**
4. MDRRMO then calls professional teams
5. Updates incident status throughout process

**Permissions:**
- Can view all incidents in their barangay
- Can update incident status
- Can assign incidents to teams (for tracking)
- Can view barangay statistics
- Receives real-time sound alerts for new incidents in their barangay
- Can access map view of barangay incidents
- Can request assistance from municipal level (escalation)

**Use Case:** Barangay secretary, barangay treasurer, or designated barangay emergency coordinator.

---

## 5. **admin** (Administrator - Legacy)
**Purpose:** Legacy administrative role (being phased out)

**Responsibilities:**
- Similar to municipal_admin but with legacy permissions
- Manage users and incidents
- Coordinate emergency responses

**Permissions:**
- Similar to municipal_admin
- Can create various user roles
- Can manage incidents and teams
- Receives real-time sound alerts

**Use Case:** Legacy administrator accounts (should be migrated to municipal_admin or appropriate roles).

---

## 6. **resident** (Community Resident)
**Purpose:** Report emergencies via WiFi (when mobile signal unavailable)

**Responsibilities:**
- Report emergency incidents using WiFi connection
- Provide incident details, photos, location
- Provide incident updates if possible
- Upload photos/videos of incidents
- Receive emergency notifications
- View public incident information

**Key Workflow:**
1. Sees emergency (fire, medical, etc.)
2. **No mobile signal** to call emergency services
3. **Uses ANY internet** (WiFi OR mobile data) to access web platform
   - If mobile data signal available → Uses mobile data
   - If no mobile data signal → Uses WiFi
4. Reports incident with details
5. System alerts Barangay Official and MDRRMO
6. Coordinators handle response

**Permissions:**
- Can create incident reports
- Can view own incidents
- Can update own incidents
- Can upload media
- Can view public incident information
- Receives notifications for relevant incidents
- **NO sound alerts** (to reduce noise)

**Use Case:** Community member who needs to report emergencies. Uses WiFi if no mobile data signal available, or uses mobile data if available.

---

## Complete Emergency Response Workflow

### Example: Fire in Remote Barangay

```
1. RESIDENT (No mobile signal, has WiFi)
   ↓ Reports fire via web platform
   
2. SYSTEM
   ↓ Automatically alerts:
   - Barangay Official (first response)
   - MDRRMO (coordination)
   
3. BARANGAY OFFICIAL
   ↓ Receives alert, attempts first response
   ↓ If fire too large → Requests escalation
   
4. MDRRMO
   ↓ Receives alert/escalation
   ↓ Reviews incident in dashboard
   ↓ CALLS FIRE DEPARTMENT DIRECTLY (phone/radio)
   ↓ Updates system: "Fire Department dispatched"
   
5. FIRE DEPARTMENT
   ↓ Responds physically (outside system)
   ↓ Reports to MDRRMO
   
6. MDRRMO
   ↓ Updates system: "In Progress" → "Resolved"
   
7. SYSTEM
   ↓ Tracks complete lifecycle
   ↓ Generates analytics
```

---

## Role Permissions Summary

### View Permissions
- **All Incidents:** super_admin, municipal_admin, admin
- **Municipal Incidents:** municipal_admin, admin, mdrrmo
- **Barangay Incidents:** barangay_official
- **Own Incidents:** resident

### Alert Permissions
- **Real-time Sound Alerts:** super_admin, municipal_admin, admin, mdrrmo, barangay_official
- **Notifications Only:** resident (no sound alerts)

### Management Permissions
- **Create Users:** super_admin, municipal_admin, admin
- **Manage Teams:** super_admin, municipal_admin, admin, mdrrmo, barangay_official
- **Assign Incidents to Teams:** super_admin, municipal_admin, admin, mdrrmo, barangay_official
- **Update Incident Status:** super_admin, municipal_admin, admin, mdrrmo, barangay_official

### Incident Reporting
- **Can Report Incidents:** All roles
- **Can Update Any Incident:** super_admin, municipal_admin, admin, mdrrmo, barangay_official
- **Can Update Own Incidents Only:** resident

---

## Role Assignment Guidelines

1. **super_admin** - Only for system administrators and platform managers
2. **municipal_admin** - For municipal administrators and designated coordinators
3. **mdrrmo** - For MDRRMO staff who coordinate and call professional teams directly
4. **barangay_official** - For barangay officials who manage local emergency operations
5. **admin** - Legacy role (should be migrated to municipal_admin)
6. **resident** - Default role for all community members

---

## Key Design Decisions

### Why No Individual Responder Accounts?

**Reason:** In real emergency response, MDRRMO calls professional teams (fire, police, medical) directly via phone/radio. These teams don't need system accounts—they respond physically and report back to MDRRMO, who updates the system.

**Benefits:**
- Simpler system (fewer roles)
- More realistic workflow
- Matches actual emergency coordination
- Easier to explain and defend

### Why Internet-Based Reporting?

**Reason:** The system works with ANY internet access (WiFi OR mobile data). Users choose what they use based on availability:
- **Areas with mobile data signal:** Can use mobile data (works even during brownouts)
- **Areas without mobile data signal:** Must use WiFi to have access (when electricity available)

**Benefits:**
- Works in remote areas (with WiFi or mobile data)
- Uses existing infrastructure
- Immediate solution (no infrastructure investment needed)
- Flexible - users choose based on what's available

---

## Notes

- All roles can view their own profile and update their own information
- Sound alerts are disabled for residents to reduce noise
- Role permissions are enforced through Row Level Security (RLS) policies
- Response teams exist in system for tracking, but teams are contacted directly by MDRRMO
- The system focuses on coordination and tracking, not direct team management
- MDRRMO is the bridge between digital platform and physical response teams
