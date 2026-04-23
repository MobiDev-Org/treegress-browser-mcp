# @treegress.com/treegress-browser-mcp

MCP server package for the Treegress browser stack.

This package currently wraps the Playwright MCP runtime and resolves `playwright-core`
from the published `@treegress.com/treegress-browser-core` package.

## Why Treegress Extends Playwright MCP

AI agents need access to the actual page structure they are testing.

Standard Playwright MCP flows expose an ARIA snapshot derived from the accessibility tree. In real test flows, that can hide interactable UI when elements are poorly represented in the accessibility layer.

Treegress extends this flow by:

- serializing the full DOM tree
- extracting the full set of interactable elements
- assigning a `refId` to each element so downstream actions such as `click`, `fill`, and similar operations can target them reliably

This package exposes that behavior through MCP. In practice, it gives the agent a structurally complete representation of the page instead of a partial accessibility abstraction, improving element coverage and enabling broader, more reliable test scenarios.

If you want to see what Treegress is building in this area, visit [treegress.com](https://treegress.com).

## Installation

You do not need a global install.

Any MCP client that supports a local `stdio` server can run Treegress with this process configuration:

```json
{
  "name": "treegress-browser",
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
```

Use the same `command` and `args` values in your client-specific config format:

- Cursor: place this server under `mcpServers` in `.cursor/mcp.json`
- VS Code or other MCP-capable editors: add the same `stdio` server in the client's MCP settings UI or config file
- Claude Desktop and similar clients: map the same values into that client's server definition format

If your client only accepts a single shell command, use this equivalent launcher:

```bash
bash -lc 'npm_config_cache=/tmp/treegress-mcp-cache npx --yes --package=@treegress.com/treegress-browser-mcp@latest treegress-browser-mcp --snapshot-engine dom'
```

Notes:

- Requires `Node.js 18+`
- `@treegress.com/treegress-browser-core` is installed automatically as a dependency
- Global `npm i -g` is not required
- `--snapshot-engine dom` enables the Treegress custom DOM snapshot path

## How It Fits Together

The Treegress browser stack is split into two published packages:

- [`@treegress.com/treegress-browser-core`](https://www.npmjs.com/package/@treegress.com/treegress-browser-core)
- [`@treegress.com/treegress-browser-mcp`](https://www.npmjs.com/package/@treegress.com/treegress-browser-mcp)

Source repositories:

- Core runtime repository: [github.com/MobiDev-Org/treegress-browser-core](https://github.com/MobiDev-Org/treegress-browser-core)
- MCP adapter repository: [github.com/MobiDev-Org/treegress-browser-mcp](https://github.com/MobiDev-Org/treegress-browser-mcp)

Role split:

- `treegress-browser-core` owns custom-dom snapshot/runtime behavior.
- `treegress-browser-mcp` exposes that runtime through MCP tools and integration wiring.

## Maintainers

This repository does not have a separate runtime build step of its own, but if an MCP release depends on new runtime behavior from Treegress core, run `npm run build` in the core repository before `npm pack` or `npm publish` here. Full dependency-sync workflow lives in the repository maintainer guide: `DEVELOPING.md`.
