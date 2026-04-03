# Treegress Browser MCP

[![npm](https://img.shields.io/npm/v/%40treegress.com%2Ftreegress-browser-mcp?label=%40treegress.com%2Ftreegress-browser-mcp)](https://www.npmjs.com/package/@treegress.com/treegress-browser-mcp)
[![npm](https://img.shields.io/npm/v/%40treegress.com%2Ftreegress-browser-core?label=%40treegress.com%2Ftreegress-browser-core)](https://www.npmjs.com/package/@treegress.com/treegress-browser-core)

Treegress Browser MCP is a Treegress-maintained fork of Playwright MCP. It exposes browser automation tools for MCP clients while delegating the snapshot and locator core to the Treegress Playwright fork.

This repository is the source for the published package [`@treegress.com/treegress-browser-mcp`](https://www.npmjs.com/package/@treegress.com/treegress-browser-mcp).

## Why Treegress Extends Playwright MCP

AI agents need access to the actual page structure they are testing.

Standard Playwright MCP flows expose an ARIA snapshot derived from the accessibility tree. In real test flows, not just simple demos, that can leave part of the UI outside the model's view when interactable elements are poorly represented in the accessibility layer.

Treegress extends this flow by:

- serializing the full DOM tree
- extracting the full set of interactable elements
- assigning a `refId` to each element so downstream actions such as `click`, `fill`, and similar operations can target them reliably

This gives the agent a structurally complete representation of the page instead of a partial accessibility-based abstraction. In practice, that improves element coverage and enables broader, more reliable test scenarios.

If you want to see what Treegress is building in this area, visit [treegress.com](https://treegress.com).

## What This Fork Adds

- MCP browser tools backed by Treegress custom DOM snapshots
- Ref-based browser actions driven by locator plans from Treegress core
- A thin adapter layer over the Treegress Playwright fork instead of a second standalone DOM engine
- Integration path designed for LLM agents that work from structured snapshots instead of screenshots

## Installation

Most users only need the MCP package.

### Cursor setup

Create `.cursor/mcp.json` in the root of the project where you want to use the server:

```json
{
  "mcpServers": {
    "treegress-browser": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "--yes",
        "--package=@treegress.com/treegress-browser-mcp@latest",
        "treegress-browser-mcp",
        "--snapshot-engine",
        "dom"
      ]
    }
  }
}
```

Notes:

- Requires `Node.js 18+`
- Global `npm i -g` is not required
- `@treegress.com/treegress-browser-core` is installed automatically as a dependency
- `--snapshot-engine dom` enables the Treegress custom DOM path

### CLI check

```bash
npx --yes --package=@treegress.com/treegress-browser-mcp@latest treegress-browser-mcp --help
```

The installed binary name remains:

```bash
npx treegress-browser-mcp --help
```

## How It Fits Together

The Treegress browser stack is split into two published packages:

- [`@treegress.com/treegress-browser-core`](https://www.npmjs.com/package/@treegress.com/treegress-browser-core)
- [`@treegress.com/treegress-browser-mcp`](https://www.npmjs.com/package/@treegress.com/treegress-browser-mcp)

This repository keeps the Playwright MCP fork structure. The publishable MCP package lives in:

- [`packages/playwright-mcp`](packages/playwright-mcp)

## Maintainers

For release, dependency-sync and build instructions, see [`DEVELOPING.md`](DEVELOPING.md).

If an MCP release depends on new runtime behavior from Treegress core, run `npm run build` in the core repository before `npm pack` or `npm publish` here.

Package-specific notes for the published MCP package live in:

- [`packages/playwright-mcp/README.md`](packages/playwright-mcp/README.md)

## Based On Playwright MCP

This repository is a customized fork built on top of Playwright MCP and the broader Playwright ecosystem.

- Upstream MCP repository: [github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- Upstream Playwright repository: [github.com/microsoft/playwright](https://github.com/microsoft/playwright)
- Upstream docs: [playwright.dev](https://playwright.dev)
- License: Apache-2.0

Treegress-specific behavior should stay explicit and attributable. The intent is to extend upstream Playwright MCP for Treegress browser automation, while preserving clear lineage to the original projects.
