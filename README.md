# CueSphere mobile app

React Native app (Expo SDK 58, Expo Router, TypeScript) for CueSphere players. It talks to the same API as the website (`../cuespherebackend`).

## Run

```bash
cp .env.example .env     # set EXPO_PUBLIC_API_URL
npm install
npx expo start           # press i (iOS simulator), a (Android emulator), w (web), or scan the QR code
```

Start the API first (`cd ../cuespherebackend && npm run dev`, port 5100).

**On a physical phone** `localhost` means the phone itself, so set `EXPO_PUBLIC_API_URL` to your computer's LAN address, e.g. `http://192.168.1.20:5100`, and restart Expo. iOS simulator can use `localhost`; the Android emulator uses `http://10.0.2.2:5100`.

## What's in it

| Screen | Route | API |
|---|---|---|
| Clubs (your clubs first) | `app/(tabs)/index.tsx` | `GET /clubs` |
| Rankings by state | `app/(tabs)/rankings.tsx` | `GET /locations/states`, `GET /stats/rankings` |
| Profile, my clubs, log out | `app/(tabs)/profile.tsx` | `GET /auth/me` |
| Club: info, join, live match, tournaments | `app/club/[slug].tsx` | `GET /clubs/:slug`, `/tournaments`, `/matches/live`, `POST /join` |
| Tournament: details, register, draw, players | `app/tournament/[clubSlug]/[slug].tsx` | tournament, registrations, eligibility, draw, `POST /register` |
| Live match (updates in real time) | `app/match/[id].tsx` | `GET /matches/:id` + Socket.IO |
| Log in / create account | `app/sign-in.tsx`, `app/register.tsx` | `POST /auth/signin`, `/auth/signup` |

## How it works

- `lib/api.ts` — fetch wrapper: sends the access token, refreshes it once on a 401 (rotating refresh token), unwraps `{ success, data }`, throws `ApiError` with the API's message.
- `lib/session.tsx` — session context; tokens are kept in the device keychain via `expo-secure-store` (`localStorage` on web).
- `lib/use-api.ts` — small data hook with loading / error / pull-to-refresh.
- `lib/live.ts` — `useLiveSignal(room)` over Socket.IO, same rooms as the website (`live:match:<id>`).
- `components/ui` — shared themed components (gold on dark, like the website).

## Checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

Builds and store releases: use EAS (`npx eas-cli@latest build`). `ios/` and `android/` are generated — configure native settings in `app.json`.
