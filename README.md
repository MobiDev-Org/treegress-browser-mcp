# Treegress Browser MCP

[![npm](https://img.shields.io/npm/v/%40treegress.com%2Ftreegress-browser-mcp?label=%40treegress.com%2Ftreegress-browser-mcp)](https://www.npmjs.com/package/@treegress.com/treegress-browser-mcp)
[![npm](https://img.shields.io/npm/v/%40treegress.com%2Ftreegress-browser-core?label=%40treegress.com%2Ftreegress-browser-core)](https://www.npmjs.com/package/@treegress.com/treegress-browser-core)

Treegress Browser MCP is a Treegress-maintained fork of Playwright MCP. It exposes browser automation tools for MCP clients while delegating the snapshot and locator core to the Treegress Playwright fork.

This repository is the source for the published package [`@treegress.com/treegress-browser-mcp`](https://www.npmjs.com/package/@treegress.com/treegress-browser-mcp).

## Why Treegress Extends Playwright MCP

AI agents need access to the actual page structure they are testing.

Standard Playwright MCP flows expose an ARIA snapshot derived from the accessibility tree. In real test flows, not just simple demos, this can leave part of the UI outside the model's view when interactable elements are poorly represented in the accessibility layer. Even when an element is returned by an ARIA snapshot, the information about that element can be too abstract for an agent to properly understand how to interact with the website and implement the scenario.

Treegress extends this flow by:

- serializing the full DOM tree
- extracting the full set of interactable elements
- enriching the information about the elements
- assigning a `refId` to each element so downstream tools such as `browser_click`, `browser_fill_form`, and similar operations can target it reliably.

This gives the agent a structurally complete representation of the page instead of a partial accessibility-based abstraction. In practice, that improves element coverage and enables broader, more reliable test scenarios.

If you want to see what Treegress is building in this area, visit [treegress.com](https://treegress.com).

## What This Fork Adds

- MCP browser tools backed by Treegress custom DOM snapshots
- A thin adapter layer over the Treegress Playwright fork instead of a second standalone DOM engine
- Integration path designed for LLM agents that work from structured snapshots instead of screenshots

## Installation

Most users only need the MCP package.

### Requirements

- Node.js 18 or newer
- Cursor, VS Code, Windsurf, Claude Desktop, Goose, or any other MCP client with local `stdio` MCP support

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

Follow the instructions in the [Configuring MCP Servers](https://docs.cline.bot/mcp/configuring-mcp-servers) section.

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

Open the [Qodo Gen](https://docs.qodo.ai/qodo-documentation/qodo-gen) chat panel in VS Code or IntelliJ, connect more tools, add a new MCP server, and paste the standard config above.

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

## CLI Options (Generated)

<!--- Options generated by update-readme.js -->

```
> npx @treegress.com/treegress-browser-mcp@latest --help
  --allowed-hosts <hosts...>            comma-separated list of hosts this
                                        server is allowed to serve from.
                                        Defaults to the host the server is bound
                                        to. Pass '*' to disable the host check.
  --allowed-origins <origins>           semicolon-separated list of TRUSTED
                                        origins to allow the browser to request.
                                        Default is to allow all.
                                        Important: *does not* serve as a
                                        security boundary and *does not* affect
                                        redirects.
  --allow-unrestricted-file-access      allow access to files outside of the
                                        workspace roots. Also allows
                                        unrestricted access to file:// URLs. By
                                        default access to file system is
                                        restricted to workspace root directories
                                        (or cwd if no roots are configured)
                                        only, and navigation to file:// URLs is
                                        blocked.
  --blocked-origins <origins>           semicolon-separated list of origins to
                                        block the browser from requesting.
                                        Blocklist is evaluated before allowlist.
                                        If used without the allowlist, requests
                                        not matching the blocklist are still
                                        allowed.
                                        Important: *does not* serve as a
                                        security boundary and *does not* affect
                                        redirects.
  --block-service-workers               block service workers
  --browser <browser>                   browser or chrome channel to use,
                                        possible values: chrome, firefox,
                                        webkit, msedge.
  --caps <caps>                         comma-separated list of additional
                                        capabilities to enable, possible values:
                                        vision, pdf, devtools.
  --cdp-endpoint <endpoint>             CDP endpoint to connect to.
  --cdp-header <headers...>             CDP headers to send with the connect
                                        request, multiple can be specified.
  --cdp-timeout <timeout>               timeout in milliseconds for connecting
                                        to CDP endpoint, defaults to 30000ms
  --codegen <lang>                      specify the language to use for code
                                        generation, possible values:
                                        "typescript", "none". Default is
                                        "typescript".
  --config <path>                       path to the configuration file.
  --console-level <level>               level of console messages to return:
                                        "error", "warning", "info", "debug".
                                        Each level includes the messages of more
                                        severe levels.
  --device <device>                     device to emulate, for example: "iPhone
                                        15"
  --executable-path <path>              path to the browser executable.
  --extension                           Connect to a running browser instance
                                        (Edge/Chrome only). Requires the
                                        "Playwright MCP Bridge" browser
                                        extension to be installed.
  --grant-permissions <permissions...>  List of permissions to grant to the
                                        browser context, for example
                                        "geolocation", "clipboard-read",
                                        "clipboard-write".
  --headless                            run browser in headless mode, headed by
                                        default
  --host <host>                         host to bind server to. Default is
                                        localhost. Use 0.0.0.0 to bind to all
                                        interfaces.
  --ignore-https-errors                 ignore https errors
  --init-page <path...>                 path to TypeScript file to evaluate on
                                        Playwright page object
  --init-script <path...>               path to JavaScript file to add as an
                                        initialization script. The script will
                                        be evaluated in every page before any of
                                        the page's scripts. Can be specified
                                        multiple times.
  --isolated                            keep the browser profile in memory, do
                                        not save it to the disk.
  --image-responses <mode>              whether to send image responses to the
                                        client. Can be "allow" or "omit",
                                        Defaults to "allow".
  --no-sandbox                          disable the sandbox for all process
                                        types that are normally sandboxed.
  --output-dir <path>                   path to the directory for output files.
  --output-mode <mode>                  whether to save snapshots, console
                                        messages, network logs to a file or to
                                        the standard output. Can be "file" or
                                        "stdout". Default is "stdout".
  --port <port>                         port to listen on for SSE transport.
  --proxy-bypass <bypass>               comma-separated domains to bypass proxy,
                                        for example
                                        ".com,chromium.org,.domain.com"
  --proxy-server <proxy>                specify proxy server, for example
                                        "http://myproxy:3128" or
                                        "socks5://myproxy:8080"
  --sandbox                             enable the sandbox for all process types
                                        that are normally not sandboxed.
  --save-session                        Whether to save the Playwright MCP
                                        session into the output directory.
  --save-trace                          Whether to save the Playwright Trace of
                                        the session into the output directory.
  --save-video <size>                   Whether to save the video of the session
                                        into the output directory. For example
                                        "--save-video=800x600"
  --secrets <path>                      path to a file containing secrets in the
                                        dotenv format
  --shared-browser-context              reuse the same browser context between
                                        all connected HTTP clients.
  --snapshot-engine <engine>            snapshot engine for page snapshots.
                                        "dom" uses the playwright-core
                                        custom-dom backend, "aria" keeps the
                                        legacy accessibility fallback. Default
                                        is "dom".
  --dom-serializer <path>               path to a domSerializer.js file for the
                                        historical/debug-only local DOM engine.
  --snapshot-mode <mode>                when taking snapshots for responses,
                                        specifies the mode to use. Can be
                                        "incremental", "full", or "none".
                                        Default is incremental.
  --dom-fallback-to-aria                historical/debug-only local DOM engine:
                                        fallback to aria-ref resolving when
                                        local dom based resolution fails.
  --dom-nonstrict                       historical/debug-only local DOM engine:
                                        disable strict locator enforcement.
  --storage-state <path>                path to the storage state file for
                                        isolated sessions.
  --test-id-attribute <attribute>       specify the attribute to use for test
                                        ids, defaults to "data-testid"
  --timeout-action <timeout>            specify action timeout in milliseconds,
                                        defaults to 5000ms
  --timeout-navigation <timeout>        specify navigation timeout in
                                        milliseconds, defaults to 60000ms
  --user-agent <ua string>              specify user agent string
  --user-data-dir <path>                path to the user data directory. If not
                                        specified, a temporary directory will be
                                        created.
  --viewport-size <size>                specify browser viewport size in pixels,
                                        for example "1280x720"
```

<!--- End of options generated section -->

## Config Schema (Generated)

<!--- Config generated by update-readme.js -->

```typescript
{
  /**
   * The browser to use.
   */
  browser?: {
    /**
     * The type of browser to use.
     */
    browserName?: 'chromium' | 'firefox' | 'webkit';

    /**
     * Keep the browser profile in memory, do not save it to disk.
     */
    isolated?: boolean;

    /**
     * Path to a user data directory for browser profile persistence.
     * Temporary directory is created by default.
     */
    userDataDir?: string;

    /**
     * Launch options passed to
     * @see https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context
     *
     * This is useful for settings options like `channel`, `headless`, `executablePath`, etc.
     */
    launchOptions?: playwright.LaunchOptions;

    /**
     * Context options for the browser context.
     *
     * This is useful for settings options like `viewport`.
     */
    contextOptions?: playwright.BrowserContextOptions;

    /**
     * Chrome DevTools Protocol endpoint to connect to an existing browser instance in case of Chromium family browsers.
     */
    cdpEndpoint?: string;

    /**
     * CDP headers to send with the connect request.
     */
    cdpHeaders?: Record<string, string>;

    /**
     * Timeout in milliseconds for connecting to CDP endpoint. Defaults to 30000 (30 seconds). Pass 0 to disable timeout.
     */
    cdpTimeout?: number;

    /**
     * Remote endpoint to connect to an existing Playwright server.
     */
    remoteEndpoint?: string;

    /**
     * Paths to TypeScript files to add as initialization scripts for Playwright page.
     */
    initPage?: string[];

    /**
     * Paths to JavaScript files to add as initialization scripts.
     * The scripts will be evaluated in every page before any of the page's scripts.
     */
    initScript?: string[];
  },

  server?: {
    /**
     * The port to listen on for SSE or MCP transport.
     */
    port?: number;

    /**
     * The host to bind the server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces.
     */
    host?: string;

    /**
     * The hosts this server is allowed to serve from. Defaults to the host server is bound to.
     * This is not for CORS, but rather for the DNS rebinding protection.
     */
    allowedHosts?: string[];
  },

  /**
   * List of enabled tool capabilities. Possible values:
   *   - 'core': Core browser automation features.
   *   - 'pdf': PDF generation and manipulation.
   *   - 'vision': Coordinate-based interactions.
   */
  capabilities?: ToolCapability[];

  /**
   * Whether to save the Playwright session into the output directory.
   */
  saveSession?: boolean;

  /**
   * Whether to save the Playwright trace of the session into the output directory.
   */
  saveTrace?: boolean;

  /**
   * If specified, saves the Playwright video of the session into the output directory.
   */
  saveVideo?: {
    width: number;
    height: number;
  };

  /**
   * Reuse the same browser context between all connected HTTP clients.
   */
  sharedBrowserContext?: boolean;

  /**
   * Secrets are used to prevent LLM from getting sensitive data while
   * automating scenarios such as authentication.
   * Prefer the browser.contextOptions.storageState over secrets file as a more secure alternative.
   */
  secrets?: Record<string, string>;

  /**
   * The directory to save output files.
   */
  outputDir?: string;

  console?: {
    /**
     * The level of console messages to return. Each level includes the messages of more severe levels. Defaults to "info".
     */
    level?: 'error' | 'warning' | 'info' | 'debug';
  },

  network?: {
    /**
     * List of origins to allow the browser to request. Default is to allow all. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
     */
    allowedOrigins?: string[];

    /**
     * List of origins to block the browser to request. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
     */
    blockedOrigins?: string[];
  };

  /**
   * Specify the attribute to use for test ids, defaults to "data-testid".
   */
  testIdAttribute?: string;

  timeouts?: {
    /*
     * Configures default action timeout: https://playwright.dev/docs/api/class-page#page-set-default-timeout. Defaults to 5000ms.
     */
    action?: number;

    /*
     * Configures default navigation timeout: https://playwright.dev/docs/api/class-page#page-set-default-navigation-timeout. Defaults to 60000ms.
     */
    navigation?: number;
  };

  /**
   * Whether to send image responses to the client. Can be "allow", "omit", or "auto". Defaults to "auto", which sends images if the client can display them.
   */
  imageResponses?: 'allow' | 'omit';

  snapshot?: {
    /**
     * When taking snapshots for responses, specifies the mode to use.
     */
    mode?: 'incremental' | 'full' | 'none';
    /**
     * Snapshot engine used to resolve element references.
     * "aria" uses the built-in aria-ref engine.
     * "dom" uses the playwright-core custom-dom backend.
     */
    engine?: 'aria' | 'dom';
    /**
     * Path to a DOM serializer module used only by the historical/debug-only
     * local DOM engine retained in this fork.
     */
    domSerializerPath?: string;
    /**
     * Historical/debug-only local DOM engine: allow fallback to aria-ref
     * resolution.
     */
    domFallbackToAria?: boolean;
    /**
     * Historical/debug-only local DOM engine: disable strict uniqueness check.
     */
    domNonstrict?: boolean;
  }

  /**
   * Whether to allow file uploads from anywhere on the file system.
   * By default (false), file uploads are restricted to paths within the MCP roots only.
   */
  allowUnrestrictedFileAccess?: boolean;
}
```

<!--- End of config generated section -->

## Browser Tools (Generated)

<!--- Tools generated by update-readme.js -->

<details>
<summary><b>Core automation</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_click**
  - Title: Click
  - Description: Perform click on a web page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `doubleClick` (boolean, optional): Whether to perform a double click instead of a single click
    - `button` (string, optional): Button to click, defaults to left
    - `modifiers` (array, optional): Modifier keys to press
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_close**
  - Title: Close browser
  - Description: Close the page
  - Parameters: None
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_console_messages**
  - Title: Get console messages
  - Description: Returns all console messages
  - Parameters:
    - `level` (string, optional): Level of the console messages to return. Each level includes the messages of more severe levels. Defaults to "info".
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_drag**
  - Title: Drag mouse
  - Description: Perform drag and drop between two elements
  - Parameters:
    - `startElement` (string): Human-readable source element description used to obtain the permission to interact with the element
    - `startRef` (string): Exact source element reference from the page snapshot
    - `endElement` (string): Human-readable target element description used to obtain the permission to interact with the element
    - `endRef` (string): Exact target element reference from the page snapshot
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_evaluate**
  - Title: Evaluate JavaScript
  - Description: Evaluate JavaScript expression on page or element
  - Parameters:
    - `function` (string): () => { /* code */ } or (element) => { /* code */ } when element is provided
    - `element` (string, optional): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string, optional): Exact target element reference from the page snapshot
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_file_upload**
  - Title: Upload files
  - Description: Upload one or multiple files
  - Parameters:
    - `paths` (array, optional): The absolute paths to the files to upload. Can be single file or multiple files. If omitted, file chooser is cancelled.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_fill_form**
  - Title: Fill form
  - Description: Fill multiple form fields
  - Parameters:
    - `fields` (array): Fields to fill in
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_handle_dialog**
  - Title: Handle a dialog
  - Description: Handle a dialog
  - Parameters:
    - `accept` (boolean): Whether to accept the dialog.
    - `promptText` (string, optional): The text of the prompt in case of a prompt dialog.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_hover**
  - Title: Hover mouse
  - Description: Hover over element on page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_navigate**
  - Title: Navigate to a URL
  - Description: Navigate to a URL
  - Parameters:
    - `url` (string): The URL to navigate to
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_navigate_back**
  - Title: Go back
  - Description: Go back to the previous page
  - Parameters: None
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_network_requests**
  - Title: List network requests
  - Description: Returns all network requests since loading the page
  - Parameters:
    - `includeStatic` (boolean, optional): Whether to include successful static resources like images, fonts, scripts, etc. Defaults to false.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_press_key**
  - Title: Press a key
  - Description: Press a key on the keyboard
  - Parameters:
    - `key` (string): Name of the key to press or a character to generate, such as `ArrowLeft` or `a`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_resize**
  - Title: Resize browser window
  - Description: Resize the browser window
  - Parameters:
    - `width` (number): Width of the browser window
    - `height` (number): Height of the browser window
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_run_code**
  - Title: Run Playwright code
  - Description: Run Playwright code snippet
  - Parameters:
    - `code` (string): A JavaScript function containing Playwright code to execute. It will be invoked with a single argument, page, which you can use for any page interaction. For example: `async (page) => { await page.getByRole('button', { name: 'Submit' }).click(); return await page.title(); }`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_select_option**
  - Title: Select option
  - Description: Select an option in a dropdown
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `values` (array): Array of values to select in the dropdown. This can be a single value or multiple values.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_snapshot**
  - Title: Page snapshot
  - Description: Capture accessibility snapshot of the current page, this is better than screenshot
  - Parameters:
    - `filename` (string, optional): Save snapshot to markdown file instead of returning it in the response.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_take_screenshot**
  - Title: Take a screenshot
  - Description: Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.
  - Parameters:
    - `type` (string, optional): Image format for the screenshot. Default is png.
    - `filename` (string, optional): File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified. Prefer relative file names to stay within the output directory.
    - `element` (string, optional): Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too.
    - `ref` (string, optional): Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too.
    - `fullPage` (boolean, optional): When true, takes a screenshot of the full scrollable page, instead of the currently visible viewport. Cannot be used with element screenshots.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_type**
  - Title: Type text
  - Description: Type text into editable element
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)
    - `slowly` (boolean, optional): Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_wait_for**
  - Title: Wait for
  - Description: Wait for text to appear or disappear or a specified time to pass
  - Parameters:
    - `time` (number, optional): The time to wait in seconds
    - `text` (string, optional): The text to wait for
    - `textGone` (string, optional): The text to wait for to disappear
  - Read-only: **false**

</details>

<details>
<summary><b>Tab management</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tabs**
  - Title: Manage tabs
  - Description: List, create, close, or select a browser tab.
  - Parameters:
    - `action` (string): Operation to perform
    - `index` (number, optional): Tab index, used for close/select. If omitted for close, current tab is closed.
  - Read-only: **false**

</details>

<details>
<summary><b>Browser installation</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_install**
  - Title: Install the browser specified in the config
  - Description: Install the browser specified in the config. Call this if you get an error about the browser not being installed.
  - Parameters: None
  - Read-only: **false**

</details>

<details>
<summary><b>Coordinate-based (opt-in via --caps=vision)</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_mouse_click_xy**
  - Title: Click
  - Description: Click left mouse button at a given position
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_mouse_drag_xy**
  - Title: Drag mouse
  - Description: Drag left mouse button to a given position
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `startX` (number): Start X coordinate
    - `startY` (number): Start Y coordinate
    - `endX` (number): End X coordinate
    - `endY` (number): End Y coordinate
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_mouse_move_xy**
  - Title: Move mouse
  - Description: Move mouse to a given position
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate
  - Read-only: **false**

</details>

<details>
<summary><b>PDF generation (opt-in via --caps=pdf)</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_pdf_save**
  - Title: Save as PDF
  - Description: Save page as PDF
  - Parameters:
    - `filename` (string, optional): File name to save the pdf to. Defaults to `page-{timestamp}.pdf` if not specified. Prefer relative file names to stay within the output directory.
  - Read-only: **true**

</details>

<details>
<summary><b>Test assertions (opt-in via --caps=testing)</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_generate_locator**
  - Title: Create locator for element
  - Description: Generate locator for the given element to use in tests
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_verify_element_visible**
  - Title: Verify element visible
  - Description: Verify element is visible on the page
  - Parameters:
    - `role` (string): ROLE of the element. Can be found in the snapshot like this: `- {ROLE} "Accessible Name":`
    - `accessibleName` (string): ACCESSIBLE_NAME of the element. Can be found in the snapshot like this: `- role "{ACCESSIBLE_NAME}"`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_verify_list_visible**
  - Title: Verify list visible
  - Description: Verify list is visible on the page
  - Parameters:
    - `element` (string): Human-readable list description
    - `ref` (string): Exact target element reference that points to the list
    - `items` (array): Items to verify
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_verify_text_visible**
  - Title: Verify text visible
  - Description: Verify text is visible on the page. Prefer browser_verify_element_visible if possible.
  - Parameters:
    - `text` (string): TEXT to verify. Can be found in the snapshot like this: `- role "Accessible Name": {TEXT}` or like this: `- text: {TEXT}`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_verify_value**
  - Title: Verify value
  - Description: Verify element value
  - Parameters:
    - `type` (string): Type of the element
    - `element` (string): Human-readable element description
    - `ref` (string): Exact target element reference that points to the element
    - `value` (string): Value to verify. For checkbox, use "true" or "false".
  - Read-only: **false**

</details>

<details>
<summary><b>Tracing (opt-in via --caps=tracing)</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_start_tracing**
  - Title: Start tracing
  - Description: Start trace recording
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_stop_tracing**
  - Title: Stop tracing
  - Description: Stop trace recording
  - Parameters: None
  - Read-only: **true**

</details>


<!--- End of tools generated section -->

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

If an MCP release depends on new runtime behavior from Treegress core, run `npm run build` in the core repository before running `npm pack` or `npm publish` here.

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
