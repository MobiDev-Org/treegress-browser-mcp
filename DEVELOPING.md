# Developing Treegress Browser MCP

This document is for maintainers of the Treegress Playwright MCP fork.

User-facing project information belongs in [`README.md`](README.md). Keep release and maintenance workflow out of the package README files so GitHub and npm previews stay product-focused.

## Package Boundaries

This repository publishes:

- [`@treegress.com/treegress-browser-mcp`](https://www.npmjs.com/package/@treegress.com/treegress-browser-mcp)

The companion core package is maintained in a separate repository and publishes:

- `@treegress.com/treegress-browser-core`

Release coordination rule:

- if runtime behavior depends on snapshot, formatter, locator compilation or ref-resolution changes, update core first
- then update the pinned core dependency in the MCP package and publish a new MCP version
- if only MCP wiring or packaging changes, a core release may not be necessary

## Source Of Truth

This repository should stay a thin MCP adapter over Treegress core where possible.

Important rule:

- do not maintain a second long-term snapshot or ref-resolution implementation here when the same behavior belongs in core

Core runtime source of truth lives in the companion Playwright fork.

## Build Dependency

This repository does not produce a separate compiled runtime bundle of its own.

However, if the MCP release depends on new runtime behavior from Treegress core, a fresh core build is mandatory before you pack or publish this repository.

Run in the companion core repository first:

```bash
cd <treegress-browser-core-repo>
npm run clean
npm run build
```

If the release changes custom DOM snapshot runtime behavior, also verify the built runtime path there before returning here:

```bash
cd <treegress-browser-core-repo>
npm run test-custom-dom-prod-path
```

## Pack

Only pack this repository after the companion core package has been rebuilt and published or packed at the exact version you pin here.

```bash
mkdir -p /tmp/treegress-release-artifacts
mkdir -p /tmp/treegress-npm-cache

cd <treegress-browser-mcp-repo>/packages/playwright-mcp
npm_config_cache=/tmp/treegress-npm-cache npm pack --dry-run
npm_config_cache=/tmp/treegress-npm-cache npm pack --pack-destination /tmp/treegress-release-artifacts
```

## Publish

Before publishing:

- bump `packages/playwright-mcp/package.json`
- update the pinned `playwright-core` alias if the MCP release depends on a new core release
- confirm `repository`, `homepage`, `author` and README content are correct
- confirm the pinned core version was packed or published from a fresh `npm run build`

Publish:

```bash
cd <treegress-browser-mcp-repo>/packages/playwright-mcp
npm_config_cache=/tmp/treegress-npm-cache npm publish --access public
npm view @treegress.com/treegress-browser-mcp version
```

## Documentation Rule

- `README.md` and package-level README files are for users
- release notes, dependency coordination and maintainer workflow belong here
