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

**Routing and auth.** `src/App.jsx` owns the `BrowserRouter` and the startup/rehydrate effects; `src/AppRoutes.jsx` holds the route tree and guards without a router, so tests mount it in a `MemoryRouter`. Guards: `PublicOnlyRoutes` (`/` landing, login, register; signed-in users go to `/dashboard`), `ProtectedRoutes` (signed in), `PasswordChangeGate` (sends a user with `mustChangePassword` to `/change-password`), `AccountAdminRoutes` (`role === 'admin'`: `/account`, `/create-case`) and `PlatformAdminRoutes` (`isAdmin`: `/recommended*`). Unknown paths redirect to `/dashboard` when signed in, otherwise to `/`. There are two unrelated admins: **account admin** (`userInfo.role`, use `selectIsAccountAdmin`) and **platform admin** (`userInfo.isAdmin`, curates Recommended). Guards only control what the UI shows; the backend enforces everything.

**Accounts.** Registering creates an account and signs its creator in as the account admin. Admins add users with a temporary password (`/account`), assign case **owners**, and archive cases; owners can run and archive the cases they own. A case can be archived once `isCaseComplete` (`src/utils/caseCompletion.js`, a mirror of the backend's `src/policies/caseCompletion.js` — keep them in step) is true. Archived cases are read-only at `/archive` and `/archive/:id`. **Creating a case is a purchase** (spec 004): `CreateCaseScreen` only collects case details and confirms with a payment warning; it sends the browser's `timezone` (`src/utils/timezone.js`) and no questions, which are added on `CaseScreen`. The backend records a transaction per case. `CaseScreen`'s Start Session saves the case, then calls `startCase` (`POST /cases/:id/start`, which records the first start) before navigating to `/start/:id`. A 404 from the case API means the user lost access: `CaseScreen` drops the case from the store and `localStorage.cases` and redirects to `/dashboard`.

**State: Zustand stores in `src/store/`.**
- `useAuthStore` holds `userInfo` (`token, userId, username, isAdmin, accountId, accountName, role, mustChangePassword`), persisted to `localStorage.userInfo`. A stored session without `accountId` (pre-accounts) is discarded. `updateSession(partial)` merges fields without a re-login. `clearUserInfo` (logout) also removes `localStorage.cases` and every `seating-draft:*` key and resets the case and account stores, so nothing leaks to the next user on a shared machine. It also holds the account's `playlists` and, for platform admins only, `recommendedNames`. After a page reload `App.jsx` re-fetches playlists and recommended names because login is what normally loads them.
- `useAccountStore` holds the account and its `users` (for owner pickers and resolving user ids to names; `usernameFor`, `activeUsersOf`, and `archivedByLabel`, which reads "automatically" for an archive the backend's 7-day job made — `archiveReason: 'purchase'`, `archivedBy: null`, spec 007). Don't write zustand selectors that return a new array/object each call (e.g. a `.filter` inside the selector) — zustand v5 re-renders forever; select the raw state and derive in the component.
- `useCaseStore` holds `cases` and `activeCase`. Cases come from the backend (`fetchUserCases` on login/register/dashboard) and are also mirrored in `localStorage.cases`. Screens that save a case (`CaseScreen`, `QuestionsScreen`, `StartScreen`) update the store and the localStorage copy along with calling `saveCase`. Keep all three in sync when you change case persistence.

**Screens (`src/screens/<name>/<Name>Screen.jsx` + `.module.css`).** Each screen is a large self-contained component that uses CSS Modules. The main flow: create a case → `/case/:id` → `/start/:caseId` (seating chart) → `/questions/:caseId` (answering questions per student). `/make-playlist` builds question playlists, which are shared across the account. The platform-admin-only recommended screens curate one recommended question set per charge. The charge is that set's unique identifier, and a set has no title.

**Scores and risk (`src/utils/studentScores.js`).** The single source of student totals and risk tiers, used by both the live Scores view in `QuestionsScreen` (circle colors, sort modal, student modal) and the archive report (`ArchivedCaseScreen` + `components/student-report/StudentReportCard`). Tiers band the score *range* (min to max) into equal thirds, not students into rank-thirds; equal scores are all `low`. Changing `bandTier` changes both screens, and `studentScores.test.js` pins the pre-refactor colors. Students are identified by student number: `chartData.rects[].assignedStudents[].id` is a number, but `answers[questionId]` keys are strings, so look answers up with `getAnswer` (it uses `String(id)`). Tier colors are the `--risk-{high,medium,low}-{bg,text}` tokens.

**Student details (spec 005).** `case.studentDetails` holds optional, viewer-only `{ age, occupation, gender, race }` per student, keyed by `String(number)`; it never affects scores or tiers and the backend never archives it. Helpers are in `src/utils/studentDetails.js`, limits in `src/types/ENUMS.js` (must match the backend's `src/types.js`). `components/student-report/StudentReportModal` is the live Student Report on both `QuestionsScreen` and `CaseScreen` (heading `Student Report - #N = X Points`, details with Edit/Save/Cancel, then answers); `StudentListModal` is `CaseScreen`'s View Students list (seated students get their tier, unseated are neutral). Details are saved only through `saveStudentDetails` (`PUT /cases/:id/students/:number/details`), never through `saveCase`, and the response's `studentDetails` is **merged** into the store's current case (`mergeStudentDetails`) so seating or answers not yet sent survive. `StudentReportCard` is the archive's report and has no details.

**Offline PDF export (spec 006).** `CaseScreen`'s **For offline use** button opens `components/pdf-export/PdfExportModal`, which builds two PDFs on the device from `activeCase`: the questions with point values and tally lines, and a two-per-row student scoring sheet. It makes no API call and persists nothing, so every export reflects the current questions. `jspdf` is reached only through the dynamic import in `src/utils/pdfExport/loadJsPdf.js` (its own Vite chunk), which runs when the modal opens. The text is in `pdfContent.js` (pure), the layout in `pdfLayout.js` and the two builders. `savePdfFiles.js` uses the share sheet only on `pointer: coarse` devices that can share files, and otherwise downloads with `<a download>`. The builders must stay synchronous so `navigator.share` is still called within the Export click's user activation.

**Konva canvases.** `StartScreen` and `QuestionsScreen` draw with `react-konva`. Canvas contexts don't resolve CSS variables, so any `fill`/`stroke` passed to Konva must go through `cssVar('--name', fallback)` from `src/utils/cssVars.js`. That helper resolves the value from `:root` and caches it per theme. `main.jsx` patches `getContext` to set `willReadFrequently` for Konva hit detection.

**Seating draft (`src/hooks/useSeatingDraft.js`).** Keeps the in-progress seating chart in `localStorage` under `seating-draft:<caseId>`, with undo history and batched writes. A draft is dropped if the case's student count has changed. `discardDraft()` is called once the chart has been committed to the case.

**Normalization.** Questions and case payloads go through `src/utils/questionNormalization.js` on the way to and from the API: TRUE_FALSE labels are coerced to booleans and option values to numbers. `src/utils/caseNormalization.js` upgrades legacy cases stored in localStorage from the old `caseType` + `charge` pair to a single `category` id.

**Case categories (`src/types/caseCategories.js`).** This is a **mirrored file**. It has to stay byte-identical to the copy in first-frame-back. If you edit it, copy the change to the other repo and bump `CATALOG_VERSION`. Category ids are slugs derived from the labels, so renaming a label orphans stored cases and needs a migration. Treat the list as append-mostly.

## Styling conventions

- All colors are CSS custom properties defined in `src/index.css`. Recent work removed hardcoded hex values across the app, so use an existing variable or add a new one there rather than hardcoding a color.
- Only reference variables that `index.css` actually defines. A `var()` naming an undefined variable makes the whole declaration invalid, so the border or background silently disappears. Every `var(--name)` and `cssVar('--name')` in `src` must appear as `--name:` in `index.css` (the only allowed exception is the `--x` placeholder in comments). `src/index.css.test.js` enforces this.
- Theme: **dark is the default** and lives in `:root`; light is the `:root[data-theme='light']` override. `initTheme()` (`src/utils/theme.js`, called in `main.jsx`) always sets `data-theme` from `localStorage.theme` (`'dark'`/`'light'`, anything else means dark). The OS `prefers-color-scheme` is ignored, and logout keeps `theme`. Every color token must be declared in **both** blocks, and no hex/`rgba` literals may appear outside `index.css` except `cssVar` fallbacks. `src/index.css.test.js` enforces both. Token roles: `--light-text` is only for text on colored fills; white backgrounds use `--surface`.
- The dashboard (`/dashboard`, `screens/dashboard/DashboardScreen`) has a dev/testing theme switch (`components/theme-toggle`, `hooks/useTheme.js`).

## Notes

- `src/utils/studentPage.js` references an undefined `activeCase` and nothing imports it. It is dead code.
- Both `src/utils/` and `src/utilities/` exist. Most helpers live in `src/utils/`.
