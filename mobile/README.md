# CyberChef AI Mobile App Production Architecture

## Build Commands
- iOS: `sh mobile/build-ios.sh`
- Android: `sh mobile/build-android.sh`

## App Store Screenshots
- See `/mobile/store-assets/screenshots/` for demo screenshots (home feed, AI recipe, recipe detail, meal planner, grocery list)

## Store Metadata Preview
- See `/mobile/store-assets/app-store-description.md` for app title, subtitle, description, features, keywords

## Production Architecture
- Assets: `/mobile/assets/` (icons, splash, launch screens, light/dark)
- Store assets: `/mobile/store-assets/` (screenshots, metadata)
- Legal: `/legal/` (privacy policy, terms)
- Build scripts: `/mobile/build-ios.sh`, `/mobile/build-android.sh`
- Env: `/mobile/.env.production`
- Version: `/mobile/version.txt`
- Analytics: `/mobile/analytics-config.js`

## Compliance
- HTTPS API requests
- No debug logs in production
- Proper permissions: camera, internet, media playback

---
For full details, see mobile folder and store-assets.
