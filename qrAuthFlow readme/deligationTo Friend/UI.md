# Glassmorphism Dark Theme — Walkthrough

## What Changed

Transformed the entire React Native frontend from a light/white theme to a premium **dark Glassmorphism** design.

### New Files Created

| File | Purpose |
|------|---------|
| [theme.ts](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/utils/theme.ts) | Centralized dark color tokens (`Colors`), `GlassCard`, `GlassInput` presets |
| [AnimatedCard.tsx](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/components/AnimatedCard.tsx) | Scroll-reveal component: fade-in + slide-up with staggered delay |

### Screens Updated (14 files)

All screens now use `Colors.bg` (`#0F0F1A`) backgrounds, `GlassCard` (translucent + bordered) surfaces, and `GlassInput` fields.

| Screen | Accent Color | Scroll Reveal |
|--------|-------------|---------------|
| Loading ([index.tsx](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/app/index.tsx)) | Indigo | — |
| Role Selection | Per-role (blue/green/red) | ✅ Cards |
| Hostel Selection | Blue / Pink | ✅ Cards |
| Guard Login | Blue | — |
| Student Login/Register | Green | — |
| Admin Login | Red | — |
| Guard Dashboard (parcels) | Blue/Amber | ✅ Parcel list |
| Guard Delivered | Green | ✅ Parcel list |
| Student All Parcels | Indigo/Amber | ✅ Parcel list |
| Student My Parcels | Green | ✅ Parcel list |
| Admin Panel | Indigo/Red | — |
| ErrorPopup | Red | — |
| Guard Tab Bar | Blue | — |
| Student Tab Bar | Green | — |

### Design Tokens

```
bg:           #0F0F1A       (deep dark)
surface:      rgba(255,255,255,0.06)
surfaceBorder: rgba(255,255,255,0.12)
accent:       #818CF8       (indigo)
accentGreen:  #34D399
accentBlue:   #60A5FA
accentRed:    #F87171
accentAmber:  #FBBF24
textPrimary:  #F1F5F9
textSecondary:#94A3B8
textMuted:    #64748B
```

## Verification

- **Style-only changes** — no business logic, API calls, or navigation was modified.
- Run the app with `npx expo start` and visually verify all screens on a device/emulator.
