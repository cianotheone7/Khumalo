# Database Maintenance Scripts

This folder contains utility scripts for maintaining and cleaning up the Azure Table Storage database.

## fix-invalid-dates.js

**Purpose:** Fixes patients with invalid `dateOfBirth` values that cause "Invalid time value" errors in the UI.

**What it does:**
1. Scans all patients in the Azure Patients table
2. Identifies patients with invalid/malformed dates
3. Clears the invalid dates (sets to empty string)
4. Logs all changes for auditing

**How to run:**

```powershell
# Run from the project root
node scripts/fix-invalid-dates.js
```

**Output example:**
```
╔════════════════════════════════════════════════════════════════════╗
║          Azure Table Storage - Date Cleanup Script                 ║
╚════════════════════════════════════════════════════════════════════╝

📥 Fetching all patients from Azure Table Storage...
   Loading page 1...
   ✅ Page 1: 1000 patients (Total: 1000)
   Loading page 2...
   ✅ Page 2: 244 patients (Total: 1244)
✅ Total patients loaded: 1244

🔍 Analyzing patients for invalid dates...

❌ Invalid date found:
   Name: Bianca
   MRN: File 142
   Invalid value: "invalid"

======================================================================

📊 Summary: Found 1 patients with invalid dates

🔄 Starting updates...

[1/1] Updating Bianca (File 142)...
   ✅ Updated successfully

======================================================================

📊 Final Results:
   ✅ Successfully updated: 1
   ❌ Failed updates: 0
   📝 Total processed: 1

✅ Database cleanup complete!

🎉 Script completed successfully!
```

**When to use:**
- After importing data from external sources
- When users report "Invalid time value" errors
- As part of regular database maintenance

**Safety:**
- Uses MERGE operation (only updates specified fields)
- Includes rate limiting (100ms delay between updates)
- Logs all operations for audit trail
- Non-destructive (only clears invalid dates, doesn't delete patients)

## Other Scripts

More maintenance scripts will be added here as needed.
