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

### Requirements

- Node.js 18 or newer
- Cursor, VS Code, Windsurf, Claude Desktop, Goose or any other MCP client with local `stdio` MCP support

### Getting started

First, install the Treegress MCP server with your client.

**Standard config** works in most tools:

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

If your client only accepts a single shell command, use this equivalent launcher:

```bash
bash -lc 'npm_config_cache=/tmp/treegress-mcp-cache npx --yes --package=@treegress.com/treegress-browser-mcp@latest treegress-browser-mcp --snapshot-engine dom'
```

Notes:

- Requires `Node.js 18+`
- Global `npm i -g` is not required
- `@treegress.com/treegress-browser-core` is installed automatically as a dependency
- `--snapshot-engine dom` enables the Treegress custom DOM path

<details>
<summary>Amp</summary>

Add via the Amp VS Code extension settings screen or by updating your `settings.json` file:

```json
"amp.mcpServers": {
  "treegress-browser": {
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
```

Amp CLI setup:

```bash
amp mcp add treegress-browser -- npx --yes --package=@treegress.com/treegress-browser-mcp@latest treegress-browser-mcp --snapshot-engine dom
```

</details>

<details>
<summary>Antigravity</summary>

Add via the Antigravity settings or by updating your configuration file:

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

</details>

<details>
<summary>Claude Code</summary>

Use the Claude Code CLI to add the Treegress MCP server:

```bash
claude mcp add treegress-browser -- npx --yes --package=@treegress.com/treegress-browser-mcp@latest treegress-browser-mcp --snapshot-engine dom
```

</details>

<details>
<summary>Claude Desktop</summary>

Follow the MCP install [guide](https://modelcontextprotocol.io/quickstart/user) and use the standard config above.

</details>

<details>
<summary>Cline</summary>

Follow the instruction in the section [Configuring MCP Servers](https://docs.cline.bot/mcp/configuring-mcp-servers).

Example local setup in `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "treegress-browser": {
      "type": "stdio",
      "command": "npx",
      "timeout": 30,
      "args": [
        "--yes",
        "--package=@treegress.com/treegress-browser-mcp@latest",
        "treegress-browser-mcp",
        "--snapshot-engine",
        "dom"
      ],
      "disabled": false
    }
  }
}
```

</details>

<details>
<summary>Codex</summary>

Use the Codex CLI to add the Treegress MCP server:

```bash
codex mcp add treegress-browser -- npx --yes --package=@treegress.com/treegress-browser-mcp@latest treegress-browser-mcp --snapshot-engine dom
```

Alternatively, create or edit `~/.codex/config.toml` and add:

```toml
[mcp_servers.treegress-browser]
command = "npx"
args = ["--yes", "--package=@treegress.com/treegress-browser-mcp@latest", "treegress-browser-mcp", "--snapshot-engine", "dom"]
```

</details>

<details>
<summary>Copilot</summary>

Use the Copilot CLI to interactively add the Treegress MCP server:

```text
/mcp add
```

Alternatively, create or edit `~/.copilot/mcp-config.json` and add:

```json
{
  "mcpServers": {
    "treegress-browser": {
      "type": "local",
      "command": "npx",
      "tools": [
        "*"
      ],
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

</details>

<details>
<summary>Cursor</summary>

Create `.cursor/mcp.json` in the root of your project and use the standard config above.

You can also add the same `command` and `args` values manually in `Cursor Settings` -> `MCP` -> `Add new MCP Server`.

</details>

<details>
<summary>Factory</summary>

Use the Factory CLI to add the Treegress MCP server:

```bash
droid mcp add treegress-browser "npx --yes --package=@treegress.com/treegress-browser-mcp@latest treegress-browser-mcp --snapshot-engine dom"
```

Alternatively, type `/mcp` within Factory droid to open an interactive UI for managing MCP servers.

</details>

<details>
<summary>Gemini CLI</summary>

Follow the MCP install [guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md#configure-the-mcp-server-in-settingsjson) and use the standard config above.

</details>

<details>
<summary>Goose</summary>

Go to `Advanced settings` -> `Extensions` -> `Add custom extension`.
Use type `STDIO`, set the command to `npx`, and use these arguments:

```text
--yes --package=@treegress.com/treegress-browser-mcp@latest treegress-browser-mcp --snapshot-engine dom
```

</details>

<details>
<summary>Kiro</summary>

Follow the MCP Servers [documentation](https://kiro.dev/docs/mcp/). For example in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "treegress-browser": {
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

</details>

<details>
<summary>LM Studio</summary>

Go to `Program` in the right sidebar -> `Install` -> `Edit mcp.json` and use the standard config above.

</details>

<details>
<summary>opencode</summary>

Follow the MCP Servers [documentation](https://opencode.ai/docs/mcp-servers/). For example in `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "treegress-browser": {
      "type": "local",
      "command": [
        "npx",
        "--yes",
        "--package=@treegress.com/treegress-browser-mcp@latest",
        "treegress-browser-mcp",
        "--snapshot-engine",
        "dom"
      ],
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary>Qodo Gen</summary>

Open [Qodo Gen](https://docs.qodo.ai/qodo-documentation/qodo-gen) chat panel in VS Code or IntelliJ, connect more tools, add a new MCP server, and paste the standard config above.

</details>

<details>
<summary>VS Code</summary>

Follow the MCP install [guide](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_add-an-mcp-server) and use the standard config above.

You can also install the Treegress MCP server using the VS Code CLI:

```bash
code --add-mcp '{"name":"treegress-browser","command":"npx","args":["--yes","--package=@treegress.com/treegress-browser-mcp@latest","treegress-browser-mcp","--snapshot-engine","dom"]}'
```

After installation, the Treegress MCP server will be available for use with your agent in VS Code.

</details>

<details>
<summary>Warp</summary>

Go to `Settings` -> `AI` -> `Manage MCP Servers` -> `+ Add` and use the standard config above.

Alternatively, use the slash command `/add-mcp` in the Warp prompt and paste the same config.

</details>

<details>
<summary>Windsurf</summary>

Follow Windsurf MCP [documentation](https://docs.windsurf.com/windsurf/cascade/mcp) and use the standard config above.

</details>

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

Source repositories:

- Core runtime repository: [github.com/MobiDev-Org/treegress-browser-core](https://github.com/MobiDev-Org/treegress-browser-core)
- MCP adapter repository: [github.com/MobiDev-Org/treegress-browser-mcp](https://github.com/MobiDev-Org/treegress-browser-mcp)

Role split:

- `treegress-browser-core` is the source of truth for custom-dom snapshot/runtime behavior (snapshot envelope, formatting helpers, locator-plan compilation, ref-resolution internals).
- `treegress-browser-mcp` provides MCP server wiring, tool contracts and client-facing integration on top of that core runtime.

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

## Copyright And Licensing

Copyright 2026 MobiDev Corporation. All rights reserved.
This project is licensed under the Apache License 2.0.
