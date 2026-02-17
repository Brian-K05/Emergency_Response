# For Remote Testers – Start Here

You will test the **Emergency Response Platform** in your browser using a **deployed URL** (not localhost).

---

## 1. What you need

- **Deployed URL** – The project owner will send you a link (e.g. `https://something.vercel.app`).
- **Test cases** – Use **TEST_CASES.md** (read in browser/editor) or **TEST_CASES.csv** (open in Excel/Sheets).
- **Test accounts** – The owner will provide at least one account per role, or tell you to register and use “Create User” (admin) to create others.

---

## 2. Roles you will test

| Role | What to test |
|------|----------------|
| **Resident** | Register, login, report incident (with/without photo), view own data. |
| **Barangay Official** | Dashboard, view barangay incidents, notifications, sound alert, update status, request municipal assistance. |
| **MDRRMO** | Dashboard, view all municipal incidents, notifications, sound, update status. |
| **Municipal Admin** | Dashboard, charts (all barangays), create user, verify residents, map view. |
| **Super Admin** | Everything above + sound alerts management. |

---

## 3. How to record results

- Open **TEST_CASES.md** or **TEST_CASES.csv**.
- For each test:
  1. Do the **Steps** exactly.
  2. Check if the **Expected result** happens.
  3. Mark **Pass** or **Fail**.
  4. In **Tester notes**, write what went wrong (e.g. error message, button missing) if Fail.
- At the end, fill the **Summary table** in TEST_CASES.md (total Pass/Fail per module) and add your name, date, and the URL you used.

---

## 4. Tips

- Use **Chrome or Edge** (latest) for best support.
- Allow **sound** if testing sound alerts (Barangay Official, MDRRMO).
- For “real-time” tests, use **two devices or two browsers** (e.g. one as Resident reporting, one as Barangay Official watching notifications/dashboard).
- If something doesn’t load, check your internet and try a hard refresh (Ctrl+F5 or Cmd+Shift+R).

---

## 5. Where to send results

Send the filled **TEST_CASES.md** or **TEST_CASES.csv** (and Summary) back to the project owner by the agreed date.

Thank you for testing.
