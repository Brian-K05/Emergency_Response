# System Requirements & Scope

## Overview

The system works with **ANY internet access** (WiFi OR mobile data). This document clarifies the system requirements and project scope.

---

## System Requirements

### Prerequisite: Internet Access Required

**The system requires internet access to function:**
- ✅ WiFi internet (when electricity available)
- ✅ Mobile data (Smart, Globe, TNT)
- ✅ Any internet connection

**If a barangay has NO internet access (no WiFi AND no mobile data):**
- They need to set up internet infrastructure first
- This is **OUTSIDE the project scope**
- Barangay/local government responsibility

---

## Project Scope Clarification

### What This Project Provides:
- ✅ Web-based emergency reporting platform
- ✅ Works with ANY internet (WiFi OR mobile data)
- ✅ Coordination and tracking system
- ✅ Real-time alerts and notifications
- ✅ Analytics and reporting

### What This Project Does NOT Provide:
- ❌ Internet infrastructure setup (WiFi routers, cell towers)
- ❌ Electricity infrastructure
- ❌ Battery backup systems
- ❌ Solar-powered WiFi systems
- ❌ Mobile data signal coverage

**These are barangay/local government responsibilities, outside the research project scope.**

---

## All Other Scenarios Work ✅

### Scenario 1: Has Electricity, Has Mobile Data Signal
```
✅ Electricity available → WiFi works
✅ Mobile data signal available → Mobile data works
✅ Can access system via WiFi OR mobile data
→ SYSTEM WORKS
```

### Scenario 2: Has Electricity, No Mobile Data Signal
```
✅ Electricity available → WiFi works
❌ No mobile data signal → Cannot use mobile data
✅ Can access system via WiFi
→ SYSTEM WORKS (when electricity available)
⚠️ Limitation: Cannot access during brownouts
```

### Scenario 3: No Electricity, Has Mobile Data Signal
```
❌ No electricity → No WiFi
✅ Mobile data signal available → Mobile data works
✅ Can access system via mobile data
→ SYSTEM WORKS (even during brownouts)
```

### Scenario 4: Has Electricity, Has Mobile Data Signal, No WiFi Router
```
✅ Electricity available → Can power WiFi router if available
✅ Mobile data signal available → Mobile data works
✅ Can access system via mobile data
→ SYSTEM WORKS
```

---

## Summary Table

| Electricity | Mobile Data Signal | Can Access System? | Notes |
|------------|-------------------|-------------------|-------|
| ✅ Yes | ✅ Yes | ✅ **YES** | Can use WiFi or mobile data |
| ✅ Yes | ❌ No | ✅ **YES** | Can use WiFi (when electricity available) |
| ❌ No | ✅ Yes | ✅ **YES** | Can use mobile data (works during brownouts) |
| ❌ No | ❌ No | ❌ **NO** | **CRITICAL LIMITATION** |

---

## Real-World Context

### Areas That Can Use the System:
- ✅ Areas with WiFi (when electricity available)
- ✅ Areas with mobile data signal
- ✅ Areas with both WiFi and mobile data

### Areas That Need Infrastructure First:
- ⚠️ Areas with NO WiFi AND NO mobile data
- ⚠️ These areas need to set up internet infrastructure first
- ⚠️ Infrastructure setup is barangay/local government responsibility
- ⚠️ **Outside the research project scope**

### Why Internet Access is Required:

1. **System is Web-Based:**
   - Requires internet connection to function
   - This is a design decision, not a limitation

2. **Project Scope:**
   - Provides software platform
   - Assumes internet infrastructure exists
   - Infrastructure setup is separate concern

---

## Infrastructure Setup (Outside Project Scope)

### If Barangay Has No Internet Access:

**Barangay/Local Government Must:**
1. Set up WiFi infrastructure (routers, internet connection)
2. Or ensure mobile data signal coverage
3. Or set up battery backup for WiFi (for brownout resilience)
4. Or set up solar-powered WiFi systems

**This is NOT part of the research project:**
- Infrastructure setup is barangay responsibility
- Research project provides software platform only
- Assumes internet access exists

### For Brownout Resilience (Barangay Responsibility):

**Barangay can set up:**
- Battery backup systems for WiFi routers
- Solar-powered WiFi systems
- Generator-powered WiFi during brownouts
- Mobile data signal coverage (work with telecom companies)

**These solutions are infrastructure concerns, outside software project scope.**

---

## For Defense

**Question:** "What if there's no electricity and no mobile data signal? Can users still report?"

**Answer:**
"The system requires internet access to function - this is a prerequisite, not a limitation. If a barangay has no WiFi and no mobile data, they need to set up internet infrastructure first. Infrastructure setup (batteries, solar WiFi, etc.) is outside the research project scope - that's the barangay's responsibility. The research project provides the software platform that works when internet is available. The barangay must ensure internet access exists before using the system."

---

## Key Messages

1. **System requires internet access** - This is a prerequisite, not a limitation

2. **Infrastructure setup is outside project scope** - Barangay responsibility

3. **Project provides software platform** - Assumes internet infrastructure exists

4. **System works when internet is available** - WiFi OR mobile data

---

**Last Updated:** Clarification - System requires internet access. Infrastructure setup (batteries, solar WiFi) is outside project scope - barangay responsibility.

