# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Joez Construction

Job management app for construction companies. Web + iOS + Android from one Expo codebase.

## Stack

- **Expo SDK 57** (expo-router, React Native 0.86, React 19.2, new-arch). Note: expo-router no longer allows importing `@react-navigation/native` — import `ThemeProvider`, `DarkTheme`, `DefaultTheme`, `Stack`, etc. from `expo-router`.
- **Convex** backend (`convex/`), project `joez-construction` on team `christopher-silvas`. Dev deployment: `peaceful-parakeet-120`.
- **Zod v4** schemas in `schemas/` are the source of truth for table shapes; `convex/schema.ts` derives Convex validators via `zodOutputToConvex` (from `convex-helpers/server/zod4`). Write Convex functions with the `zQuery`/`zMutation` helpers in `convex/lib/convex.ts`.
- **WorkOS AuthKit** auth via `@convex-dev/workos-authkit` component. Client side: PKCE flow in `lib/workos-client.ts` (system browser on native, full-page redirect on web), wired through `providers/WorkOSAuthProvider.tsx` → `ConvexProviderWithAuth` in `app/_layout.tsx`. Server side: `convex/auth.ts` + `convex/http.ts` (webhook routes) + `convex/auth.config.ts` (JWT providers). WorkOS events sync the `users` table in `convex/users.ts`.
- **NativeWind 4** (Tailwind 3) — theme tokens are CSS vars in `global.css`, mirrored in `lib/theme.ts` (nav theme). Currently the neutral placeholder palette; swap both files together when branding.
- **React Native Reusables** components in `components/ui/` (add more: `bunx @react-native-reusables/cli@latest add <component>`).
- **Bun** is the package manager.

## Commands

- `bun start` — Expo dev server; `bunx convex dev` — Convex dev (run both while developing)
- `bunx tsc --noEmit` — typecheck; `bun run lint` — lint

## Environment

- `.env.local` (gitignored): Convex URLs written by `convex dev`, plus `EXPO_PUBLIC_WORKOS_CLIENT_ID`.
- Convex dev deployment needs `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_WEBHOOK_SECRET` (`bunx convex env set ...`).
