# CyberChef AI Demo Mode Architecture

## Overview
Demo Mode allows visitors to instantly explore the platform without signup. Sessions are temporary, sandboxed, and reset every 30 minutes.

## Demo User Flow
1. Visitor lands on `/try-demo` (public entry page).
2. Clicks "Try the Live Demo" → redirected to `/demo`.
3. Temporary demo_user session is auto-generated.
4. Demo user sees sample recipes, videos, meal plans, analytics.
5. Demo banner: "Demo Mode — Data resets every session." + "Create Real Account" button.
6. All actions use sandbox data; real account creation, billing, and production edits are blocked.
7. Demo analytics tracked via `/analytics/demo-event`.
8. Demo data resets every 30 minutes via background job.

## Demo Architecture
- **Routes:** `/try-demo`, `/demo`, `/analytics/demo-event`
- **Session:** Temporary demo_user, 30-min expiration
- **Data:** Sample recipes, videos, meal plans, analytics
- **Restrictions:** Middleware blocks real account/billing/production edits
- **Banner:** UI shows demo mode and account creation option
- **Reset:** Background job resets demo data
- **Analytics:** Tracks demo usage and conversions
- **Security:** Demo mode sandboxed from real user/billing data

## Example Demo UI
- Demo landing: Product preview + "Try the Live Demo"
- Demo platform: Banner, sample content, sandbox actions, account button

---
For full implementation, see demo service files and UI components.
