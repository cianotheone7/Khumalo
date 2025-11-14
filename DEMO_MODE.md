# Demo Mode Documentation

## Overview

The Cortexha Healthcare Application now includes a **Demo Mode** that provides a safe, public-facing version of the application using completely anonymized mock data. This allows you to showcase the application's features without exposing any real patient information or requiring access to live Azure storage accounts.

## Features

### 🎭 Demo Mode Highlights

- **Anonymized Data**: All patient information, medical records, prescriptions, and documents are generated mock data
- **No Real Data Access**: Demo mode does not connect to Azure Storage, Azure Tables, or any production resources
- **Safe for Public Demonstrations**: Can be shared publicly without privacy or security concerns
- **Full Feature Showcase**: Demonstrates all major features including:
  - Patient management
  - Document management
  - Prescription creation and management
  - AI-powered medical summaries
  - Activity tracking
  - Dashboard analytics

### 🔒 Security

- Demo users cannot access real patient data
- All operations in demo mode are local (in-memory cache)
- No sensitive data is stored or transmitted
- Email sending is disabled in demo mode (shows informational message)
- Clear visual indicators show when in demo mode

## How to Use Demo Mode

### Option 1: Demo Login Credentials

The easiest way to access demo mode is using the dedicated demo login:

**Email**: `demo@cortexha.com`  
**Password**: `demo123`

These credentials are publicly available and safe to share for demonstrations.

### Option 2: Environment Variable

Set the following environment variable in your `.env.local` file:

```env
VITE_DEMO_MODE=true
```

This will enable demo mode for all users.

## Visual Indicators

When in demo mode, users will see:

1. **Login Screen**: Demo credentials displayed with clear instructions
2. **Sidebar**: Yellow badge showing "🎭 DEMO MODE - Anonymized Data Only"
3. **Disabled Features**: Email sending shows informative message that it's disabled in demo mode

## Demo Data

The demo mode generates:

- **50 Demo Patients**: With realistic but anonymized:
  - Names, emails, phone numbers
  - Medical record numbers
  - Insurance information
  - Chronic conditions and allergies
  - South African addresses

- **25 Demo Documents**: Including:
  - Lab results
  - Imaging reports
  - Consultation notes
  - Prescriptions
  - Other medical documents

- **15 Demo Prescriptions**: With:
  - Common medications from SA Formulary
  - Realistic dosages and frequencies
  - Diagnostic information

- **30 Recent Activities**: Showing:
  - Patient additions
  - Document uploads
  - Prescription creations
  - AI summary generations

- **10 AI Summaries**: Demonstrating the AI analysis feature

## Switching Between Demo and Production

### To Enable Demo Mode:
1. Log in with `demo@cortexha.com` / `demo123`
2. OR set `VITE_DEMO_MODE=true` in environment

### To Use Production Mode:
1. Log in with your real credentials
2. Ensure `VITE_DEMO_MODE` is not set to `true`

### Clearing Demo Cache:
Demo data is cached during the session for consistency. To reset:
- Log out and log back in
- Clear browser local storage
- Refresh the page

## Technical Implementation

### Architecture

```
┌─────────────────────┐
│   Auth Component    │
│  (Login Screen)     │
└──────────┬──────────┘
           │
           ├─── Demo Login → setDemoUserFlag(true)
           │
           └─── Real Login → setDemoUserFlag(false)
                      │
                      ▼
           ┌──────────────────────┐
           │   Data Service       │
           │   (Router Layer)     │
           └──────────┬───────────┘
                      │
                      ├─── isDemoMode() → Demo Data Service
                      │                    (generates mock data)
                      │
                      └─── !isDemoMode() → Azure Services
                                           (real data from Azure)
```

### Key Files

- **`src/services/demoDataService.ts`**: Generates and manages demo data
- **`src/services/dataService.ts`**: Routes requests to demo or real services
- **`src/components/Auth.tsx`**: Handles demo login
- **`src/components/Sidebar.tsx`**: Shows demo mode indicator
- **`.env.example`**: Documents environment variables

### Data Flow

1. User logs in with demo credentials
2. `setDemoUserFlag(true)` is called
3. All data operations check `isDemoMode()` or `isCurrentUserDemo()`
4. If true, return mock data from `demoDataService.ts`
5. If false, call real Azure services

## Limitations in Demo Mode

The following features are disabled or simulated in demo mode:

- ❌ **Email Sending**: Cannot send actual emails (shows informational message)
- ❌ **File Uploads**: File uploads are simulated (no actual blob storage)
- ❌ **Azure Integration**: No connection to Azure Storage, Tables, or OpenAI
- ✅ **All UI Features**: All interface elements work normally
- ✅ **Data Operations**: CRUD operations work on in-memory cache

## Best Practices

### For Public Demonstrations

1. **Always use demo credentials** when presenting to external audiences
2. **Clear browser cache** before starting a fresh demo
3. **Show the demo indicator** to make it clear this is demo data
4. **Explain limitations** (e.g., email sending is disabled)

### For Development

1. Use demo mode for frontend development without Azure setup
2. Test UI components with realistic data
3. Demo mode is faster (no network calls)

### For Production

1. Never set `VITE_DEMO_MODE=true` in production environment
2. Keep demo credentials separate from production credentials
3. Monitor for unauthorized access attempts using demo credentials on production

## FAQ

### Q: Can demo users see real patient data?
**A**: No. Demo mode uses completely separate, anonymized mock data.

### Q: Will demo mode operations affect production data?
**A**: No. Demo mode never connects to Azure or any production services.

### Q: Can I customize the demo data?
**A**: Yes. Edit `src/services/demoDataService.ts` to modify mock data generation.

### Q: How do I know if I'm in demo mode?
**A**: Look for the yellow "🎭 DEMO MODE" badge in the sidebar.

### Q: Can I switch from demo to production without logging out?
**A**: No. You must log out and log back in with different credentials.

### Q: Is demo mode secure for public access?
**A**: Yes. Demo mode contains no real data and cannot access production resources.

## Support

For questions or issues with demo mode:
1. Check this documentation
2. Review the `.env.example` file
3. Inspect browser console for demo mode messages (prefixed with 🎭)
4. Contact development team

## Version History

- **v1.0.0** (January 2025): Initial demo mode implementation
  - Demo login credentials
  - Anonymized data generation
  - Visual indicators
  - Email sending protection
