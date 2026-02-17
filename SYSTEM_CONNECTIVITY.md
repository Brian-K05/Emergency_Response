# System Connectivity - How It Works

## Overview

**The system works with ANY internet access** - WiFi OR mobile data. Users choose what they use based on what's available in their area.

---

## How Users Access the System

### Option 1: Mobile Data (Smart, Globe, TNT)
- ✅ Works if mobile data signal is available
- ✅ Can report even during brownouts (no electricity needed)
- ✅ More resilient to power interruptions
- ✅ Users can use mobile data on their phones/devices

### Option 2: WiFi Internet
- ✅ Works when WiFi is available
- ✅ Requires electricity (WiFi routers need power)
- ❌ Cannot work during brownouts (no electricity = no WiFi)
- ✅ Users connect to WiFi network and access web platform

---

## User Choice Based on Availability

**The system does NOT require a specific type of internet.** Users choose based on what's available:

### Scenario A: Area WITH Mobile Data Signal
```
User has mobile data signal available
→ Uses mobile data to access system
→ Can report even during brownouts
→ More reliable option
```

### Scenario B: Area WITHOUT Mobile Data Signal
```
User has NO mobile data signal
→ MUST use WiFi to have access
→ Can report when electricity is available
→ Cannot report during brownouts (limitation)
```

### Scenario C: Area WITH Both
```
User has both mobile data AND WiFi available
→ Can choose either option
→ Mobile data preferred during brownouts
→ WiFi preferred when electricity is stable
```

---

## Key Points

1. **System is NOT WiFi-only** - Works with ANY internet (WiFi OR mobile data)

2. **Users choose based on availability:**
   - If mobile data signal available → Use mobile data
   - If no mobile data signal → Use WiFi

3. **For places with NO mobile data signal:**
   - They MUST use WiFi to have access
   - This is their only option for internet access

4. **Advantage of mobile data areas:**
   - Can report even during brownouts
   - More resilient to power interruptions

5. **Limitation of WiFi-only areas:**
   - Cannot report during brownouts
   - Dependent on electricity availability

6. **SYSTEM REQUIREMENT:**
   - **System requires internet access** (WiFi OR mobile data) - This is a prerequisite
   - **If barangay has NO internet:** They must set up infrastructure first (outside project scope)
   - **Infrastructure setup** (batteries, solar WiFi) is barangay responsibility, not part of research project

---

## System Access Scenarios

| Electricity | Mobile Data Signal | WiFi Available | Can Access System? | Notes |
|------------|-------------------|----------------|-------------------|-------|
| ✅ Yes | ✅ Yes | ✅ Yes | ✅ **YES** | Can use WiFi or mobile data |
| ✅ Yes | ✅ Yes | ❌ No | ✅ **YES** | Can use mobile data |
| ✅ Yes | ❌ No | ✅ Yes | ✅ **YES** | Can use WiFi |
| ✅ Yes | ❌ No | ❌ No | ✅ **YES** | Can use WiFi (if router has power) |
| ❌ No | ✅ Yes | ❌ No | ✅ **YES** | Can use mobile data (works during brownouts) |
| ❌ No | ❌ No | ❌ No | ❌ **NO** | **LIMITATION: Cannot access system** |

**Key Limitation:**
- ❌ **NO electricity AND NO mobile data signal = Cannot access system**
- This is the only scenario where reporting is impossible
- All other scenarios allow system access

---

## Technical Implementation

The system is a **web-based platform** that:
- Works on any device with a web browser
- Requires internet connection (WiFi OR mobile data)
- Does NOT require specific network type
- Automatically adapts to available connection

**No special configuration needed** - users simply access the website using whatever internet they have available.

---

## For Defense

**Question:** "Is this a WiFi-based system?"

**Answer:** 
"No, the system works with ANY internet access - WiFi OR mobile data. Users choose what they use based on what's available in their area. For places with no mobile data signal, they must use WiFi to have access. The system doesn't care which type of internet connection is used - it works with both."

---

**Last Updated:** Clarification - System works with ANY internet (WiFi OR mobile data), users choose based on availability.

