# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev            # Start React (Vite) + Electron in parallel
npm run dev:react      # Vite dev server only (localhost:5123)
npm run dev:electron   # Transpile Electron TS then launch Electron
npm run build          # Full build: tsc -b (type-check) + vite build
npm run transpile:electron  # Compile src/electron/ → dist-electron/
npm run test:e2e       # Playwright end-to-end tests
npm run lint           # ESLint
npm run dist:win       # Package for Windows (portable + NSIS installer)
npm run dist:mac       # Package for macOS (DMG)
npm run dist:linux     # Package for Linux (AppImage)
```

Run a single e2e test:
```bash
npx playwright test -g "test name pattern"
```

Run tests with proxy bypass (required if system has HTTP_PROXY set):
```bash
NO_PROXY="localhost,127.0.0.1,::1" npx playwright test
```

**Prerequisites**: Node.js 18+, `npx playwright install` (first time).

### E2E Test Setup (pre-run checklist)

The e2e tests use Playwright's Electron launcher. Before running tests, **temporarily modify `src/electron/main.ts`** to allow clean test teardown:

**Change 1** — Skip single-instance lock (L17-18):
```ts
// const gotTheLock = app.requestSingleInstanceLock();
const gotTheLock = isDev() ? true : app.requestSingleInstanceLock(); // 测试用
```
(also add `isDev` to the import from `./utils.js`)

**Change 2** — Disable hide-to-tray so window closes directly (L36-47):
```ts
mainWindow.on('close', () => {
  // 测试用：直接关闭，不走隐藏托盘逻辑
});
```

Then:
```bash
npm run transpile:electron   # Must recompile after main.ts changes
npm run test:e2e
```

**Revert both changes after testing.** The tests need these because:
- Single-instance lock prevents multiple Electron processes (tests launch one per spec file)
- Hide-to-tray intercepts `window.close()`, causing `electronApp.close()` to hang

### E2E Test Architecture

- **6 spec files**, 27 tests total, 1 Electron launch per spec (`beforeAll`/`afterAll`)
- `e2e/helpers.ts` — shared `setupSuite`, `teardownSuite`, `openFloatingMenu`, `closeFloatingMenu`
- All tests run serially (`workers: 1`, `fullyParallel: false`)
- Vite binds to `127.0.0.1:5123` (IPv4, not `::1`) so Playwright's HTTP health-check works on Windows

**Known environment issues on this machine:**
- `HTTP_PROXY=http://127.0.0.1:7897` — must clear or set `NO_PROXY` to bypass for localhost
- Framer Motion animations (0.16s) require `waitForTimeout` buffers between menu open/close actions

## Build Architecture

Two completely separate TypeScript compilations:

| Layer | Config | Tool | Output |
|---|---|---|---|
| Renderer (React) | `tsconfig.app.json` | Vite 6 | `dist-react/` |
| Main process (Electron) | `src/electron/tsconfig.json` | `tsc` directly | `dist-electron/` |

The root `tsconfig.json` only has project references. Vite config at root only handles the React frontend (`base: './'`, outDir: `dist-react`). The Electron tsconfig uses `module: "NodeNext"` and targets the Electron Node.js runtime, NOT bundled — `tsc` emits CJS/ESM files as-is.

## High-Level Architecture

### Main Process (`src/electron/`)

**Entry**: `main.ts`
- Creates the fixed-size 400×500 frameless window
- Single-instance lock (prevents double-launch)
- Sets up IPC handlers, tray, downloader, image header interception
- Window close = hide to tray (not quit); system tray manages actual quit

**IPC Layer** — Type-safe bridge between main and renderer:

- `ipcTools.ts` — `IpcMainOn` (fire-and-forget) and `IpcMainHandle` (request-response) wrappers. Both validate sender origin against dev localhost:5123 or production file URL to prevent malicious IPC.
- `preload.cts` — `contextBridge.exposeInMainWorld` exposes two APIs on `window`:
  - `window.electron` — window controls, downloads, queue ops, settings, content fetching (collection/bangumi/user-video)
  - `window.biliApi` — auth-only (QR login, check login, logout, getUserInfo)
- `ipcEventHandler.ts` — All channel handlers registered here via `setupIpcHandlers(win)`.
- `types.d.ts` (root) — `EventPayloadMapping` is the **single source of truth** for all IPC channel names and their payload types. `Window` interface declares both `window.electron` and `window.biliApi` types.

**Download pipeline** (`utils.ts` + `downloadQueue.ts`):

1. URL → `extractBV()` → `getCid(bvid)` → `getPlayUrl(bvid, cid)` (selects quality from settings, uses durl for qn≤32, DASH otherwise)
2. `downloadFile()` — HEAD request first; files > 5MB with range support → 4-thread parallel download to temp dir, then reassemble; smaller files → single stream
3. `mergeWithFfmpeg()` — `ffmpeg -c copy` merges video+audio m4s into MP4 (no re-encode)
4. Queue: serial processing, up to 3 retries, 60s stall timeout, AbortController for cancellation

**Other main-process modules**:
- `bilibiliClient.ts` — Axios instance with `tough-cookie` CookieJar (`axios-cookiejar-support`)
- `bilibiliAuthService.ts` — QR code login flow: generate → poll → sync cookies → persist
- `cookieStore.ts` — Serialize/deserialize CookieJar to `biliCookies.json` in `app.getPath('userData')`
- `bangumiService.ts`, `collectionService.ts`, `userVideoService.ts` — Fetch content-type-specific data from Bilibili APIs
- `wbiSign.ts` — WBI signing for Bilibili API requests (mixin key + md5)
- `pathResolver.ts` — All path resolution (dev vs production paths differ). `isDev()` checks `NODE_ENV === 'development'`.
- `tray.ts` — System tray with context menu, download progress display, single-instance second-instance handling
- `createWindows.ts` — Window creation, dev/prod URL loading, renderer crash recovery

### Renderer (`src/ui/`)

- React 19 + Tailwind CSS 4 + Framer Motion (animations)
- **Entry**: `main.tsx` — preloads settings & queue from main process via IPC before rendering, then bootstraps React
- **App component** (`App.tsx`) — Single orchestrator: owns all panel/overlay visibility state, wires `useDownloadManager`, `useCollection`, `useBangumi`, `useUserVideo` hooks together into a unified `VideoListPanel`

**State management**:
- `stores/settingsStore.ts` — Custom `useSyncExternalStore` store for settings + cached user info (5-min TTL on user info). Deduplicates concurrent load promises. Settings persisted to main process via IPC.
- `stores/queueStore.ts` — `useSyncExternalStore` store for download queue state, synced from main process push events.
- `stores/appRuntimeContext.ts` — React Context for background-mode state (window hidden → throttling enabled).

**Hooks** (`hooks/`):
- `useDownloadManager` — Core download orchestration: URL input, folder selection, share link parsing, download trigger
- `useCollection` / `useBangumi` / `useUserVideo` — Fetch content lists from main process, manage selection state, confirm bulk download
- `useDownloadQueue` — Subscribes to queue updates from main process
- `useBiliQrLogin` — QR code login flow on the renderer side
- `useBackgroundMode` — Listens for background/foreground transitions

**Key pattern**: Content-type hooks (`useCollection`, `useBangumi`, `useUserVideo`) all return a common interface (data, selectedKeys, toggle, selectAll, deselectAll, close, confirmDownload). `App.tsx` maps these into a unified `VideoListPanel` component with generic `VideoListItem[]` props.

### Type System

All shared types live in root `types.d.ts`. `EventPayloadMapping` is the **IPC contract** — adding a new IPC channel requires entries in:
1. `EventPayloadMapping` (key + payload type)
2. `Window.electron` or `Window.biliApi` interface (renderer-side function signature)
3. `preload.cts` (actual `contextBridge` exposure)
4. `ipcEventHandler.ts` (main-process handler)
5. `ipcTools.ts` type inference handles the rest automatically

### Persistence

| Data | Location | Format |
|---|---|---|
| App settings | `{userData}/Settings.json` | JSON (`Settings` type) |
| Bilibili cookies | `{userData}/biliCookies.json` | Serialized CookieJar JSON |
| Download temp files | `os.tmpdir()/bili-download-*` | Raw files (auto-cleaned on quit) |

### Content Link Types

`shareLinkValidator.ts` classifies URLs into: `bv` (single video), `ep` (bangumi episode), `both` (invalid — ambiguous), `space` (user space → triggers `useUserVideo`). The `FloatingActions` menu shows different options based on the detected type.
