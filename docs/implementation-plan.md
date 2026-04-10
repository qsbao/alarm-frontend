# Fab Alarm Frontend Demo — Implementation Plan

## Context

`C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/` is currently empty (only a `CLAUD.md`). The user wants a self-contained fab alarm management web demo, fed entirely by mock data, with two pages:

1. **Issue list page** — table with date, alarm_type, risk_level, issue_status, title, context (issue_time, operation), dimensions (product, owner, department); filter, search, sort, pagination.
2. **Issue detail page** — 4-state workflow (New → Investigating → Resolved → Closed), assign owner, comment, link/unlink alarms, activity timeline. Each issue links to zero or more alarms.

The visual design and component system must match `C:/Users/qingsheng.bao/github/qsbao/skill-web-ide/frontend/` (React 19 + Vite + TS + Tailwind + Zustand + lucide-react, custom design tokens, dark/light themes).

**Hard constraints from `fab-alarm-frontend/CLAUD.md`:** runs on a private internal network — no Google Fonts, no CDN URLs, all assets via npm/pnpm. Note: that CLAUD.md mentions a pnpm workspace, but it was inherited from the reference; **this project is a flat single frontend, not a workspace** (user-confirmed).

---

## Tech Stack

React 19 + TypeScript 5.7 + Vite 6 + React Router 7 + Zustand 5 + Tailwind 3 + lucide-react. No UI library — reuse the custom design system from the reference. No backend, no MSW — a thin in-memory mock API module.

## Setup Commands

Run from `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/`:

```
pnpm init
pnpm add react@^19.0.0 react-dom@^19.0.0 react-router-dom@^7.13.1 zustand@^5.0.0 lucide-react@^1.0.1
pnpm add -D typescript@^5.7.0 @types/react@^19.0.0 @types/react-dom@^19.0.0 @vitejs/plugin-react@^4.3.0 vite@^6.0.0 tailwindcss@^3.4.0 postcss@^8.4.0 autoprefixer@^10.4.0
```

Then patch `package.json`:
- Add `"type": "module"`.
- Set `"name": "fab-alarm-frontend"` (no `@scope/`).
- Add scripts: `"dev": "vite"`, `"build": "tsc -b && vite build"`, `"preview": "vite preview"`.
- Do NOT add `"workspaces"`. Do NOT create a `pnpm-workspace.yaml`.

> Note: the reference uses `@tailwindcss/typography`, but the alarm app renders no markdown — drop it from both dependencies and `tailwind.config.js` plugins.

---

## File Creation Order

### Phase 1 — Config & shell (create before any `src/` files)

| File | Source |
|---|---|
| `index.html` | Model after `skill-web-ide/frontend/index.html`; change `<title>` to `Fab Alarm Management`. |
| `vite.config.ts` | Minimal: `defineConfig({ plugins: [react()], server: { port: 5173 } })`. No proxy, no monaco. |
| `postcss.config.js` | Copy verbatim from `skill-web-ide/frontend/postcss.config.js`. |
| `tailwind.config.js` | Copy verbatim from `skill-web-ide/frontend/tailwind.config.js`, **remove** `require('@tailwindcss/typography')` from `plugins`. |
| `tsconfig.json` | Self-contained (do not extend `tsconfig.base.json` — it doesn't exist here). Standard React+Vite settings: target ES2022, jsx react-jsx, strict, moduleResolution Bundler, types `["vite/client"]`, include `["src"]`. |
| `src/vite-env.d.ts` | `/// <reference types="vite/client" />` |
| `src/index.css` | **Copy verbatim** from `skill-web-ide/frontend/src/index.css`. Provides all design tokens and `.btn-*`, `.card`, `.badge`, `.input-base`, `.header-bar`, `.text-theme-*`, `.bg-accent-subtle`, dark/light theming. |
| `src/main.tsx` | Strip monaco from reference: `import './index.css'` and render `<App />` in StrictMode at `#root`. |

### Phase 2 — Types & mock data

**`src/types.ts`**

```ts
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'New' | 'Investigating' | 'Resolved' | 'Closed';
export type AlarmType =
  | 'TempSpike' | 'PressureDrop' | 'FlowAnomaly' | 'ChamberLeak'
  | 'VoltageSag' | 'ParticleCount' | 'VacuumFault' | 'RFMismatch'
  | 'GasFlowDeviation' | 'EndpointDrift';

export interface Alarm {
  id: string;            // "alm-001"
  type: AlarmType;
  severity: RiskLevel;
  time: string;          // ISO 8601
  machineId: string;     // "LITHO-07"
  chamberId?: string;
  message: string;
  value?: number;
  unit?: string;
}

export type ActivityType =
  | 'created' | 'status_change' | 'assignment'
  | 'comment' | 'alarm_linked' | 'alarm_unlinked';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: string;     // ISO 8601
  author: string;
  fromStatus?: IssueStatus;
  toStatus?: IssueStatus;
  assignedTo?: string;
  text?: string;
  alarmId?: string;
}

export interface Issue {
  id: string;            // "iss-001"
  title: string;
  date: string;          // ISO 8601 — creation date (table column "date")
  alarmType: AlarmType;  // table column "alarm_type"
  riskLevel: RiskLevel;
  status: IssueStatus;
  // context columns
  issueTime: string;     // when it physically happened
  operation: string;     // e.g. "Wafer transfer"
  // dimension columns
  product: string;       // e.g. "A7-Litho"
  owner: string;         // e.g. "H. Tanaka"
  department: string;    // e.g. "Litho"
  // detail-only fields
  description: string;
  relatedAlarmIds: string[];
  activity: ActivityEntry[];   // ascending; render reversed
}
```

**Column → field map:** date→`date`, alarm_type→`alarmType`, risk_level→`riskLevel`, issue_status→`status`, title→`title`, issue_time→`issueTime`, operation→`operation`, product→`product`, owner→`owner`, department→`department`.

**Valid status transitions** (used by `WorkflowStepper`):
- New → Investigating
- Investigating → New | Resolved
- Resolved → Investigating | Closed
- Closed → Investigating (reopen)

**`src/mocks/alarms.ts`** — `MOCK_ALARMS: Alarm[]`, ~60–100 deterministic entries spanning all `AlarmType`s and severities, machine IDs like `LITHO-07`, `ETCH-12`, etc.

**`src/mocks/issues.ts`** — `MOCK_ISSUES: Issue[]`, 30–50 entries with deterministic dates over the last 30 days, spread across all 4 statuses, all 4 risk levels, ~6 products, ~8 owners, 4 departments (Litho, Etch, Diffusion, Metrology). Each issue holds 0–5 entries in `relatedAlarmIds` (drawn from `MOCK_ALARMS`) and a seed `activity: [{ type: 'created', ... }]`.

### Phase 3 — Mock API layer

**`src/api/client.ts`** — in-memory mock that mirrors the shape of `skill-web-ide/frontend/src/api/client.ts` (single exported `api` object, async methods). Holds module-level mutable copies of the seed arrays (cloned at import time). Each method `await`s a 100–200 ms `setTimeout` then mutates the arrays in place. All mutation methods append a single `ActivityEntry` to `issue.activity` — **this is the only place activity entries are created** (single chokepoint = guaranteed audit log). Hardcode `const CURRENT_USER = 'demo.user'` for the `author` field.

Methods:
- `listIssues(): Promise<Issue[]>`
- `getIssue(id): Promise<Issue | undefined>`
- `updateIssueStatus(id, next): Promise<Issue>` — appends `status_change`
- `assignIssueOwner(id, owner): Promise<Issue>` — appends `assignment`
- `addComment(id, text): Promise<Issue>` — appends `comment`
- `linkAlarm(id, alarmId): Promise<Issue>` — appends `alarm_linked`
- `unlinkAlarm(id, alarmId): Promise<Issue>` — appends `alarm_unlinked`
- `listAlarms(): Promise<Alarm[]>`
- `getAlarmsByIds(ids): Promise<Alarm[]>`

### Phase 4 — Stores (Zustand)

**`src/stores/themeStore.ts`** — copy from `skill-web-ide/frontend/src/stores/themeStore.ts`, change the localStorage key from `skill-ide-theme` to `fab-alarm-theme`.

**`src/stores/issueStore.ts`** — UI state only for the list page:

```ts
interface IssueStore {
  search: string;
  riskFilter: RiskLevel | 'all';
  statusFilter: IssueStatus | 'all';
  alarmTypeFilter: AlarmType | 'all';
  sortKey: 'date' | 'risk_level';
  sortDir: 'asc' | 'desc';
  page: number;       // 1-based
  pageSize: number;   // fixed 20
  // setters: any setter that changes a filter MUST reset page to 1
  setSearch / setRiskFilter / setStatusFilter / setAlarmTypeFilter / setSort / setPage / reset
}
```

**Decision:** filters/search/page live in Zustand, **not** URL query params — simpler for a demo, mirrors the reference's `skillStore` pattern.

### Phase 5 — Hooks

**`src/hooks/useIssues.ts`** — fetches `api.listIssues()` once on mount into local state. Reads filters/sort/page from `useIssueStore` and computes `filtered`, `pageItems`, `totalPages` via `useMemo`. Returns `{ allIssues, filtered, pageItems, totalPages, loading, refresh }`.

**`src/hooks/useIssue.ts`** — `useIssue(id: string)` loads one issue plus its related alarms. Returns `{ issue, alarms, loading, reload, changeStatus, assignOwner, addComment, linkAlarm, unlinkAlarm }`. Each mutator calls the matching `api.*` method, then re-sets local state from the returned issue (and re-fetches alarms via `api.getAlarmsByIds` for link/unlink).

### Phase 6 — Components

**Shared:**
- `src/components/ThemeToggle.tsx` — copy verbatim from `skill-web-ide/frontend/src/components/ThemeToggle.tsx`.

**List components — `src/components/issues/`:**
- `RiskBadge.tsx` — `.badge` plus risk-keyed Tailwind colors (`text-red-400 bg-red-500/10 border-red-500/20` for Critical, orange for High, amber for Medium, slate for Low). Semantic colors are OK to inline — same approach the reference uses for `.btn-danger`.
- `StatusBadge.tsx` — same pattern keyed by `IssueStatus` (New=blue, Investigating=amber, Resolved=emerald, Closed=slate/muted).
- `FilterBar.tsx` — `.input-base` search input with Search icon, three `<select>`s (risk/status/alarm_type) styled with `.input-base`, and a "Clear" `.btn-ghost`. Reads/writes `useIssueStore`. `flex gap-2 flex-wrap`.
- `IssueRow.tsx` — single `<tr>` with all columns in the column-map order. Whole row clickable → `navigate('/issues/' + id)`. Hover: `hover:bg-surface-overlay/40`.
- `IssueTable.tsx` — `<thead>` with sortable headers for `date` and `risk_level` (click → store `setSort`); other headers are plain labels. `<tbody>` maps `pageItems` from `useIssues`. Wrapped in a `.card`. Footer holds prev/next buttons + "Page X of Y".

**Detail components — `src/components/issue-detail/`:**
- `IssueHeader.tsx` — back link `← Issues`, title, id, RiskBadge, StatusBadge. Grid of dimension chips (product/owner/department) and context chips (issue_time/operation). `Assign owner` button toggles inline input + Save/Cancel (mirror the inline-mode pattern in `skill-web-ide/frontend/src/pages/Dashboard.tsx` lines 53–78).
- `WorkflowStepper.tsx` — horizontal 4-step stepper. Steps up to and including current = filled accent circles + connector; later steps = muted outlines. Below the stepper, render 1–2 transition buttons per the valid-transition table (e.g. when status=Investigating: `[Mark Resolved]` `btn-primary`, `[Back to New]` `btn-secondary`). Calls `changeStatus(next)`.
- `AlarmList.tsx` — `.card` titled "Related Alarms (n)". Each alarm row: type badge, severity dot, machine/chamber id, time, ghost X button → `unlinkAlarm`. Bottom "Link Alarm" button opens an inline picker listing alarms not yet linked (one-shot `api.listAlarms()` filtered client-side); selecting one calls `linkAlarm`.
- `CommentBox.tsx` — `.input-base` textarea (`rows={3}`) + "Post comment" `.btn-primary`. Clears on submit. Calls `addComment`.
- `ActivityTimeline.tsx` — `.card` "Activity". Renders `issue.activity.slice().reverse()` so newest is on top. One row per entry: lucide icon by type (`created`→Plus, `status_change`→ArrowRight, `assignment`→UserCheck, `comment`→MessageSquare, `alarm_linked`→Link, `alarm_unlinked`→Unlink), human description, relative time.

### Phase 7 — Layout, pages, routing

**`src/layouts/AppShell.tsx`** — model after `skill-web-ide/frontend/src/layouts/AppShell.tsx`. Replace `Blocks` logo with `AlertTriangle` (lucide). Title chip "Fab Alarm". Single nav tab "Issues" → `/issues`. Right side: `<ThemeToggle />`. Outer structure unchanged: `.header-bar flex items-center px-4 h-10`, `<main className="flex-1 overflow-hidden"><Outlet /></main>`.

**`src/pages/IssueListPage.tsx`** —
```
<div className="h-full flex flex-col bg-surface-base">
  <div className="header-bar px-6 py-4">
    <h1 className="text-lg font-semibold text-theme-primary mb-3">Issues</h1>
    <FilterBar />
  </div>
  <div className="flex-1 overflow-y-auto p-6">
    {loading ? <Loading /> : <IssueTable />}
  </div>
</div>
```

**`src/pages/IssueDetailPage.tsx`** — reads `:id` via `useParams`, calls `useIssue(id)`. Loading state and "Issue not found" fallback. Layout: `IssueHeader` full-width on top, then a `lg:grid-cols-3` grid — left column (col-span-2): `WorkflowStepper`, description card, `CommentBox`; right column: `AlarmList`, `ActivityTimeline`. Each block wrapped in `.card p-4`.

**`src/App.tsx`**

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Navigate to="/issues" replace />} />
    <Route element={<AppShell />}>
      <Route path="/issues" element={<IssueListPage />} />
      <Route path="/issues/:id" element={<IssueDetailPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

---

## State-location summary

| State | Lives in | Why |
|---|---|---|
| Theme (dark/light) | `themeStore` + localStorage | Global, persistent |
| Filters/search/sort/page | `issueStore` (Zustand) | Global within list view |
| Full issue list | `useIssues` local state | Tied to hook lifecycle |
| Single issue (detail) | `useIssue` local state | Scoped to one route |
| Inline assign mode, comment draft, link-picker open | Local `useState` | Pure UI |
| Current route | URL | Router owns it |

Mutations flow `component → useIssue → api.* → mutate in-memory array → return updated issue → hook re-sets local state → component re-renders`. The list page does NOT share the same in-memory instance — it refetches on mount. Mutations are lost on full reload (acceptable for a demo).

---

## Critical files (paths to create)

- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/package.json`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/index.html`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/vite.config.ts`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/postcss.config.js`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/tailwind.config.js`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/tsconfig.json`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/{vite-env.d.ts,index.css,main.tsx,App.tsx,types.ts}`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/api/client.ts`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/mocks/{issues.ts,alarms.ts}`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/stores/{themeStore.ts,issueStore.ts}`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/hooks/{useIssues.ts,useIssue.ts}`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/layouts/AppShell.tsx`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/pages/{IssueListPage.tsx,IssueDetailPage.tsx}`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/components/ThemeToggle.tsx`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/components/issues/{FilterBar,IssueTable,IssueRow,RiskBadge,StatusBadge}.tsx`
- `C:/Users/qingsheng.bao/github/qsbao/fab-alarm-frontend/src/components/issue-detail/{IssueHeader,WorkflowStepper,AlarmList,CommentBox,ActivityTimeline}.tsx`

## Files to copy verbatim (or near-verbatim) from the reference

| Target | Source |
|---|---|
| `src/index.css` | `skill-web-ide/frontend/src/index.css` |
| `postcss.config.js` | `skill-web-ide/frontend/postcss.config.js` |
| `tailwind.config.js` | `skill-web-ide/frontend/tailwind.config.js` (drop typography plugin) |
| `src/components/ThemeToggle.tsx` | `skill-web-ide/frontend/src/components/ThemeToggle.tsx` |
| `src/stores/themeStore.ts` | `skill-web-ide/frontend/src/stores/themeStore.ts` (rename localStorage key) |

---

## Verification

```
pnpm install
pnpm dev
```
Open `http://localhost:5173`.

**List page (`/issues`):**
1. Header "Issues" + filter bar + table renders 20 rows; pagination shows "Page 1 of N".
2. Type in search → rows narrow by title/owner; page resets to 1.
3. Risk/status/alarm_type dropdowns each filter the table.
4. Click `date` header → sort flips; click `risk_level` header → severity sort.
5. Pagination prev/next advances pages.
6. Theme toggle (top-right): UI switches dark↔light cleanly; reload preserves theme via `fab-alarm-theme` localStorage key.

**Detail page (click any row):**
1. Routes to `/issues/iss-XXX`. Header shows title, id, badges, dimension/context chips.
2. `WorkflowStepper` highlights current state; valid transition buttons appear.
3. Click "Mark Investigating" → stepper advances; activity timeline gets a `status_change` entry at the top.
4. Click "Assign owner", type a name, Enter → header owner chip updates; `assignment` entry appears.
5. Type a comment, post → textarea clears; `comment` entry appears.
6. Related Alarms card lists linked alarms; click X to unlink → row disappears, `alarm_unlinked` entry appears.
7. "Link Alarm" picker → choose one → it appears in the list, `alarm_linked` entry appears.
8. Back link returns to list.

**Constraint check:** open DevTools Network tab — confirm zero requests to `fonts.googleapis.com` or any non-localhost host. Run `pnpm build` to confirm a clean production build.
