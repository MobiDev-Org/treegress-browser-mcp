# DOM Snapshot Engine

This document describes the current `snapshot-engine=dom` behavior in this fork and the status of the older vendored local DOM engine code.

## Flow

- `browser_snapshot` calls `Tab.captureSnapshot()`.
- If `snapshot.engine === "aria"`, MCP falls back to the legacy accessibility snapshot path.
- If `snapshot.engine === "dom"`, MCP calls `page._snapshotForAI({ backend: "custom-dom" })`.
- `playwright-core` returns the normalized custom-dom envelope.
- MCP formats that envelope via `playwright-core/lib/tools/exports` helpers and caches:
  - `alias ref -> stable serializer id`
  - `stable serializer id + frame path -> locator plan`
- Ref-based action tools resolve through that cached locator plan data and then execute native Playwright locators.

## Source of truth

The source of truth for DOM snapshots is now the custom-dom backend implemented in `playwright-core`, not the older vendored local `domSerializer.js` execution path inside this fork.

## Locator resolution

All action tools that use `ref` now call:

`tab.resolveLocatorFromRef({ ref, element })`

- First MCP tries the cached custom-dom alias/locator-plan resolver.
- If that path has no current alias entry, MCP can still fall back to legacy `aria-ref` resolution.

The normal `dom` runtime path does not use the vendored local DOM engine candidate compiler anymore.

## Cache / invalidation

- Custom-dom alias and locator-plan caches are stored on `Tab`.
- A new snapshot refreshes those caches.
- The snapshot text shown to the client is produced by the `playwright-core` formatter helpers.

## Historical local DOM engine

This fork still contains an older local DOM engine implementation that:

- loads `domSerializer.js`
- may inject scripts into the page
- may execute serializer logic in page context
- builds a local `domMap`

That code remains only for historical/debug purposes and should not be extended as part of the main MCP browser tool path.

The related flags are therefore historical/debug-only:

- `--dom-serializer`
- `--dom-fallback-to-aria`
- `--dom-nonstrict`
- `PLAYWRIGHT_MCP_DOM_SERIALIZER_PATH`
- `PLAYWRIGHT_MCP_DOM_FALLBACK_TO_ARIA`
- `PLAYWRIGHT_MCP_DOM_NONSTRICT`
