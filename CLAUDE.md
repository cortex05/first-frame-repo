# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: Vite dev server
- `npm run build`: production build to `dist/`
- `npm run lint`: ESLint (flat config, `eslint.config.js`: JS recommended + react-hooks + react-refresh)
- `npm run preview`: serve the built `dist/`
- `npm test`: Vitest + jsdom + Testing Library (`npx vitest run src/AppRoutes.test.jsx` for one file, `-t "name"` for one test). Tests sit next to their source as `*.test.js(x)`; setup is `src/test/setup.js`.

Plain JavaScript/JSX, no TypeScript. Existing files carry pre-existing lint errors (unused `React` imports, `studentPage.js`); don't add new ones.

## Backend

This is the frontend only. The API is a separate repo, **first-frame-back**, which deploys independently. The base URL comes from `VITE_API_BASE_URL` (default `http://localhost:3000/api`). `src/api/axiosInstance.js` appends `/api` if the URL is missing it. Endpoint paths live in `src/config/config.js`. Every API call in `src/api/*` passes the JWT as a `Bearer` header explicitly; there is no interceptor. Deployed on Vercel, and `vercel.json` rewrites all paths to `index.html` for SPA routing.

## Architecture

**Routing and auth.** `src/App.jsx` owns the `BrowserRouter` and the startup/rehydrate effects; `src/AppRoutes.jsx` holds the route tree and guards without a router, so tests mount it in a `MemoryRouter`. Guards: `PublicOnlyRoutes` (login/register), `ProtectedRoutes` (signed in), `PasswordChangeGate` (sends a user with `mustChangePassword` to `/change-password`), `AccountAdminRoutes` (`role === 'admin'`: `/account`, `/create-case`) and `PlatformAdminRoutes` (`isAdmin`: `/recommended*`). There are two unrelated admins: **account admin** (`userInfo.role`, use `selectIsAccountAdmin`) and **platform admin** (`userInfo.isAdmin`, curates Recommended). Guards only control what the UI shows; the backend enforces everything.

**Accounts.** Registering creates an account and signs its creator in as the account admin. Admins add users with a temporary password (`/account`), assign case **owners**, and archive cases; owners can run and archive the cases they own. A case can be archived once `isCaseComplete` (`src/utils/caseCompletion.js`, a mirror of the backend's `src/policies/caseCompletion.js` — keep them in step) is true. Archived cases are read-only at `/archive` and `/archive/:id`. A 404 from the case API means the user lost access: `CaseScreen` drops the case from the store and `localStorage.cases` and redirects home.

**State: Zustand stores in `src/store/`.**
- `useAuthStore` holds `userInfo` (`token, userId, username, isAdmin, accountId, accountName, role, mustChangePassword`), persisted to `localStorage.userInfo`. A stored session without `accountId` (pre-accounts) is discarded. `updateSession(partial)` merges fields without a re-login. `clearUserInfo` (logout) also removes `localStorage.cases` and every `seating-draft:*` key and resets the case and account stores, so nothing leaks to the next user on a shared machine. It also holds the account's `playlists` and, for platform admins only, `recommendedNames`. After a page reload `App.jsx` re-fetches playlists and recommended names because login is what normally loads them.
- `useAccountStore` holds the account and its `users` (for owner pickers and resolving user ids to names; `usernameFor`, `activeUsersOf`). Don't write zustand selectors that return a new array/object each call (e.g. a `.filter` inside the selector) — zustand v5 re-renders forever; select the raw state and derive in the component.
- `useCaseStore` holds `cases` and `activeCase`. Cases come from the backend (`fetchUserCases` on login/register/home) and are also mirrored in `localStorage.cases`. Screens that save a case (`CaseScreen`, `QuestionsScreen`, `StartScreen`) update the store and the localStorage copy along with calling `saveCase`. Keep all three in sync when you change case persistence.

**Screens (`src/screens/<name>/<Name>Screen.jsx` + `.module.css`).** Each screen is a large self-contained component that uses CSS Modules. The main flow: create a case → `/case/:id` → `/start/:caseId` (seating chart) → `/questions/:caseId` (answering questions per student). `/make-playlist` builds question playlists, which are shared across the account. The platform-admin-only recommended screens curate one recommended question set per charge. The charge is that set's unique identifier, and a set has no title.

**Scores and risk (`src/utils/studentScores.js`).** The single source of student totals and risk tiers, used by both the live Scores view in `QuestionsScreen` (circle colors, sort modal, student modal) and the archive report (`ArchivedCaseScreen` + `components/student-report/StudentReportCard`). Tiers band the score *range* (min to max) into equal thirds, not students into rank-thirds; equal scores are all `low`. Changing `bandTier` changes both screens, and `studentScores.test.js` pins the pre-refactor colors. Students are identified by student number: `chartData.rects[].assignedStudents[].id` is a number, but `answers[questionId]` keys are strings, so look answers up with `getAnswer` (it uses `String(id)`). Tier colors are the `--risk-{high,medium,low}-{bg,text}` tokens.

**Konva canvases.** `StartScreen` and `QuestionsScreen` draw with `react-konva`. Canvas contexts don't resolve CSS variables, so any `fill`/`stroke` passed to Konva must go through `cssVar('--name', fallback)` from `src/utils/cssVars.js`. That helper resolves the value from `:root` and caches it per theme. `main.jsx` patches `getContext` to set `willReadFrequently` for Konva hit detection.

**Seating draft (`src/hooks/useSeatingDraft.js`).** Keeps the in-progress seating chart in `localStorage` under `seating-draft:<caseId>`, with undo history and batched writes. A draft is dropped if the case's student count has changed. `discardDraft()` is called once the chart has been committed to the case.

**Normalization.** Questions and case payloads go through `src/utils/questionNormalization.js` on the way to and from the API: TRUE_FALSE labels are coerced to booleans and option values to numbers. `src/utils/caseNormalization.js` upgrades legacy cases stored in localStorage from the old `caseType` + `charge` pair to a single `category` id.

**Case categories (`src/types/caseCategories.js`).** This is a **mirrored file**. It has to stay byte-identical to the copy in first-frame-back. If you edit it, copy the change to the other repo and bump `CATALOG_VERSION`. Category ids are slugs derived from the labels, so renaming a label orphans stored cases and needs a migration. Treat the list as append-mostly.

## Styling conventions

- All colors are CSS custom properties defined in `src/index.css`. Recent work removed hardcoded hex values across the app, so use an existing variable or add a new one there rather than hardcoding a color.
- Only reference variables that `index.css` actually defines. A `var()` naming an undefined variable makes the whole declaration invalid, so the border or background silently disappears. The token set was trimmed, so check after editing styles: every `var(--name)` in `src` should appear as `--name:` in `index.css` (the only allowed exception is `--x` in `cssVars.js` comments).
- Theme: light is the default. Dark mode applies through `:root[data-theme='dark']` or through `prefers-color-scheme` when no `data-theme` is set.

## Notes

- `src/utils/studentPage.js` references an undefined `activeCase` and nothing imports it. It is dead code.
- Both `src/utils/` and `src/utilities/` exist. Most helpers live in `src/utils/`.
