# Recall — Private, local-first personal archive

## What it is
A calm Android-first Expo app for saving everything you want to find again: links, notes, checklists, images, and voice snippets. Everything stays on-device. No account.

## Core user flows
- **Capture:** From the Android Sharesheet or the "+" button. Choose Link / Note / Checklist / Image / Voice. Links auto-extract OpenGraph title, description, and preview image on-device.
- **Daily Inbox:** Shows today's reminders, a quick self-message box, and recent captures with filter chips (All, Reminders, Notes, Links, Voice) and full-text search.
- **Archive & Search:** Scoped search across all items (All / Pinned / Archived), horizontal folder shelf, and tap-to-filter.
- **Reminders:** Time-based (one-time, daily, weekly, monthly) and location-based (arrive/leave) reminders backed by local notifications + Expo Location geofencing.
- **Settings:** Local notification permission, JSON export via system share, hard clear, "on-device only" copy.

## Architecture
- Expo SDK 57, Expo Router (file-based), TypeScript.
- Local persistence through `@react-native-async-storage/async-storage` with keys `recall.items.v1`, `recall.folders.v1`, `recall.reminders.v1`. Legacy `nexuslink.*` keys are migrated transparently on first read.
- Design tokens live in `src/theme.ts` (editorial terracotta on cream).
- Reminders use `expo-notifications` for schedule/cancel and `expo-task-manager` + `expo-location` for geofenced triggers (device-only).
- Voice recording via `expo-audio` (`useAudioRecorder`), image picking via `expo-image-picker`.
- No backend. FastAPI starter in `/app/backend` is unused.

## Key files
- `app/_layout.tsx`, `app/(tabs)/_layout.tsx` — root + tab navigation.
- `app/(tabs)/index.tsx` — Daily Inbox.
- `app/(tabs)/archive.tsx` — Archive & Search with folders.
- `app/(tabs)/reminders.tsx` — Reminders list (Upcoming / Done / Places).
- `app/(tabs)/settings.tsx` — Settings & export.
- `app/add.tsx` — Universal composer (all 5 item types).
- `app/reminder.tsx` — Time + location reminder editor.
- `app/item/[id].tsx` — Unified detail (link, note, checklist, image, voice).
- `src/links/storage.ts` — AsyncStorage models + legacy migration.
- `src/links/notifications.ts` — Notification + geofence helpers (web-guarded).
- `src/links/metadata.ts` — URL normalization + OpenGraph extraction.
- `src/components/RecallLogo.tsx` — Editorial Recall mark.

## Native capabilities & build notes
- Android share-target configured via `android.intentFilters` for `text/plain`.
- Required permissions in `app.json`: `POST_NOTIFICATIONS`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `RECORD_AUDIO`, `READ_MEDIA_IMAGES`.
- Location geofencing, background notifications, and voice recording only work on a real device build (Expo Go web preview is limited).

## Backlog
- Rich text / sketch note types.
- Snooze / repeat weekdays for reminders.
- Multi-image notes.
- iCloud/Google Drive encrypted backup.
