# Emergency Response Platform – Test Cases

**For remote testers:** Use the **deployed URL** (not localhost). For each test, follow the steps, check the expected result, then mark **Pass** or **Fail** and add notes if needed.

---

## How to use this document

1. Open the deployed app in your browser (link provided by project owner).
2. For each test case:
   - Follow the **Steps** exactly.
   - Check if the **Expected result** happens.
   - Mark **Pass** or **Fail** in the table (or in TEST_CASES.csv if you use Excel).
   - In **Tester notes**, write any bug description or comment (e.g. “Error message: …”, “Button not visible”).
3. Use test accounts for each role (project owner will provide or create them).

---

## Test accounts needed

| Role | Use for |
|------|--------|
| **Resident** | Report incidents, view own data |
| **Barangay Official** | Dashboard, incidents (barangay), notifications, sound, update status, escalation |
| **MDRRMO** | Dashboard, all incidents, notifications, sound, update status |
| **Municipal Admin** | Dashboard, charts, create user, verify residents, map |
| **Super Admin** | All of the above + sound alerts management |

Create at least one user per role (via Register + Account Setup, or Admin Create User for non-residents).

---

## 1. Authentication

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 1.1 | Register new resident | 1. Open app → Register. 2. Fill email, password, name, phone. 3. Select Municipality + Barangay. 4. Submit. | Account created; redirected to Login or Account Setup. | | | |
| 1.2 | Login with valid credentials | 1. Enter email and password. 2. Click Sign in. | Redirected to Dashboard (or Account Setup if profile incomplete). | | | |
| 1.3 | Login with wrong password | 1. Enter valid email, wrong password. 2. Sign in. | Error message; stay on Login. | | | |
| 1.4 | Logout | 1. While logged in, open profile/menu. 2. Click Logout. | Redirected to Login; cannot access protected pages. | | | |
| 1.5 | Account setup (municipality/barangay) | 1. Login as user without municipality/barangay. 2. Complete Account Setup: select Municipality, Barangay, submit. | Profile saved; can access dashboard. | | | |
| 1.6 | Protected route redirect | 1. Logout. 2. In browser go to /dashboard (or /incidents, /notifications). | Redirected to Login. | | | |

---

## 2. Resident – Incident reporting

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 2.1 | Open Report Incident page | 1. Login as Resident. 2. Go to Report Incident (or dashboard link). | Report form loads; can select type, location, description. | | | |
| 2.2 | Submit incident (required fields only) | 1. Select incident type. 2. Enter description. 3. Ensure location is filled (auto or manual). 4. Submit. | Success message; incident appears in View Incidents (or confirmation). | | | |
| 2.3 | Submit with photo/video | 1. Fill required fields. 2. Attach at least one photo or video. 3. Submit. | Incident created; media visible when opening incident details. | | | |
| 2.4 | Submit without required field | 1. Leave description (or type) empty. 2. Submit. | Validation error; form not submitted. | | | |
| 2.5 | Location auto-fill | 1. Login as resident with barangay/municipality set. 2. Open Report form. | Location section shows or pre-fills user’s barangay/municipality. | | | |

---

## 3. Notifications

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 3.1 | Notification appears for new incident | 1. User A = Barangay Official (or MDRRMO). 2. User B = Resident. 3. B reports incident in A’s barangay. 4. A stays on Dashboard or Notifications. | A gets a new notification (and sound if role has alerts). | | | |
| 3.2 | Open Notifications page | 1. Login as Barangay Official or MDRRMO. 2. Go to Notifications. | List of notifications; unread clearly marked. | | | |
| 3.3 | Mark as read by viewing incident | 1. Have an unread notification for an incident. 2. Click notification (or open incident from list). 3. Open that incident (modal or page). 4. Go back to Notifications. | That notification is now read (no unread badge for it). | | | |
| 3.4 | Real-time new notification | 1. Tester A on Notifications page. 2. Tester B (or another tab) reports incident that triggers notification for A. | New notification appears on A’s list without refresh. | | | |

---

## 4. Sound alerts (Barangay Official / MDRRMO / Admin)

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 4.1 | Sound plays for coordinator on new incident | 1. Login as Barangay Official or MDRRMO. 2. Keep Dashboard or app tab open. 3. Another user reports incident in that barangay (or any for MDRRMO). | Sound plays when incident is created. | | | |
| 4.2 | No sound for resident | 1. Login as Resident. 2. Another user reports incident. | No sound alert for resident. | | | |
| 4.3 | Sound stops / no duplicate when viewing | 1. Get sound alert for an incident. 2. Open that incident (view details). 3. Do not close. | Sound stops; no repeated sound for same incident. | | | |

---

## 5. Dashboard and real-time updates

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 5.1 | Dashboard loads | 1. Login as Barangay Official (or any role). 2. Open Dashboard. | Dashboard loads; stats/cards or incident list visible. | | | |
| 5.2 | Real-time new incident on dashboard | 1. User A on Dashboard (View Incidents or dashboard list). 2. User B reports new incident (in A’s scope). | New incident appears on A’s screen without refresh. | | | |
| 5.3 | Barangay sees only own barangay incidents | 1. Login as Barangay Official. 2. View incidents list. | Only incidents in that official’s barangay. | | | |
| 5.4 | MDRRMO sees municipal incidents | 1. Login as MDRRMO. 2. View incidents. | Incidents for that municipality (all barangays). | | | |
| 5.5 | Municipal admin sees all barangays | 1. Login as Municipal Admin. 2. Open dashboard/charts or incident list. | Can see data for all barangays in municipality. | | | |

---

## 6. Incident details and status

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 6.1 | Open incident details | 1. From dashboard or View Incidents, click an incident. | Modal or page shows type, description, location, status, media. | | | |
| 6.2 | Barangay Official updates status | 1. Login as Barangay Official. 2. Open incident in their barangay. 3. Change status (e.g. Assigned → In Progress). 4. Save. | Status updates; new status visible in details and list. | | | |
| 6.3 | MDRRMO updates status | 1. Login as MDRRMO. 2. Open incident. 3. Change status (e.g. In Progress → Resolved). 4. Save. | Status updates; reflected everywhere. | | | |
| 6.4 | Request municipal assistance (escalation) | 1. Login as Barangay Official. 2. Open incident in their barangay. 3. Click “Request Municipal Assistance” (or similar). 4. Confirm. | Success message; MDRRMO gets notification / escalation visible. | | | |
| 6.5 | Resident cannot update status | 1. Login as Resident. 2. Open any incident. | No button to update status (or button disabled/hidden). | | | |
| 6.6 | Media visible in details | 1. Open an incident that has photo/video. | Attached media displayed (images/videos load). | | | |

---

## 7. Dashboard charts (Barangay Official / Municipal Admin)

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 7.1 | Barangay monthly stats | 1. Login as Barangay Official. 2. Open Dashboard. | Charts or summary for that barangay (e.g. by month, by type). | | | |
| 7.2 | Municipal admin – all barangays | 1. Login as Municipal Admin. 2. Open Dashboard. | Option to select barangay or see summary for all; charts load. | | | |
| 7.3 | Charts show data | 1. Ensure there are incidents in last months. 2. Open dashboard with charts. | Line/bar/pie (or similar) show numbers; no crash. | | | |

---

## 8. Admin – Create user

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 8.1 | Access Create User page | 1. Login as Super Admin or Municipal Admin. 2. Go to Admin → Create User (or link in sidebar). | Form to create user (email, password, role, municipality/barangay if needed). | | | |
| 8.2 | Create Barangay Official | 1. Fill email, password. 2. Role = Barangay Official. 3. Select Municipality + Barangay. 4. Submit. | Success; new user can login and has Barangay Official role. | | | |
| 8.3 | Create MDRRMO user | 1. Role = MDRRMO. 2. Select Municipality. 3. Submit. | User created; can login as MDRRMO. | | | |
| 8.4 | Role dropdown / options | 1. Open Create User. 2. Check Role field. | Options include: Super Admin, Municipal Admin, MDRRMO, Barangay Official, Admin, Resident. | | | |

---

## 9. Admin – Verify residents

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 9.1 | Access Verify Residents page | 1. Login as Super Admin, Municipal Admin, or MDRRMO. 2. Go to Verify Residents (or Admin → Verify Residents). | List of residents (pending or all) with verify/reject or similar. | | | |
| 9.2 | Verify a resident | 1. Find unverified resident. 2. Click Verify (or Approve). | Resident marked verified; can use full features. | | | |
| 9.3 | Reject (if available) | 1. Find pending resident. 2. Click Reject. | Resident marked rejected or pending; behavior as designed. | | | |

---

## 10. Super Admin – Sound alerts management

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 10.1 | Access Sound Alerts page | 1. Login as Super Admin. 2. Go to Admin → Sound Alerts (or link). | Page loads; can see/upload sound settings. | | | |
| 10.2 | Upload custom sound (if supported) | 1. Use upload/choose file. 2. Select sound file. 3. Save. | Success message; sound used for new alerts (or as documented). | | | |

---

## 11. Map view

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 11.1 | Access Map (allowed role) | 1. Login as Municipal Admin or MDRRMO (or Super Admin). 2. Go to Map. | Map page loads; incidents or markers shown if any. | | | |
| 11.2 | Resident/Barangay no map (if restricted) | 1. Login as Resident or Barangay Official. 2. Check menu/sidebar. | No Map link, or Map link redirects/forbidden. | | | |

---

## 12. View Incidents list and filters

| # | Test case | Steps | Expected result | Pass | Fail | Tester notes |
|---|-----------|--------|------------------|:----:|:----:|--------------|
| 12.1 | View Incidents page loads | 1. Login. 2. Go to View Incidents. | List of incidents (according to role); no crash. | | | |
| 12.2 | Click incident opens details | 1. Click one incident in the list. | Details open (modal or new page). | | | |
| 12.3 | Status filter (if available) | 1. Use status filter (e.g. Reported, Resolved). 2. Apply. | List updates to match selected status. | | | |

---

## Summary table (tester fill)

Copy this table into your report or sheet. One row per tester if needed.

| Module | Total | Passed | Failed | Notes |
|--------|-------|--------|--------|-------|
| 1. Authentication | 6 | | | |
| 2. Resident – Incident reporting | 5 | | | |
| 3. Notifications | 4 | | | |
| 4. Sound alerts | 3 | | | |
| 5. Dashboard & real-time | 5 | | | |
| 6. Incident details & status | 6 | | | |
| 7. Dashboard charts | 3 | | | |
| 8. Admin – Create user | 4 | | | |
| 9. Admin – Verify residents | 3 | | | |
| 10. Super Admin – Sound alerts | 2 | | | |
| 11. Map view | 2 | | | |
| 12. View Incidents list | 3 | | | |
| **Total** | **46** | | | |

**Tester name:** _______________________  
**Date:** _______________________  
**Deployed URL used:** _______________________
