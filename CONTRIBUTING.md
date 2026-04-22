# Contributing

Thanks for contributing to Treegress Browser MCP.

## Before you start

1. Create or pick an issue first (except small typo/docs-only fixes).
2. Confirm repository ownership of the change:
- MCP wiring/tool contract/config changes belong here.
- Snapshot/formatter/locator-plan/ref-resolution runtime behavior belongs in `treegress-browser-core` first.

## Local setup

Requires Node.js 18+.

```bash
node --version
```

Clone this repository:

```bash
git clone https://github.com/MobiDev-Org/treegress-browser-mcp.git
cd treegress-browser-mcp
```

Install dependencies:

```bash
npm ci
```

Run workspace lint:

```bash
npm run lint
```

Run MCP package tests:

```bash
cd packages/playwright-mcp
npx playwright install
npm run test
```

## Documentation

If config/behavior/tool contracts changed, update docs in the same PR.

At minimum, review:

- `README.md`
- `DEVELOPING.md`
- `docs/dom-snapshot.md`
- `packages/playwright-mcp/README.md`

## Commit messages

Use conventional commits:

```text
label(namespace): title
```

Recommended labels: `fix`, `feat`, `docs`, `test`, `devops`, `chore`.

## Pull request policy (strict)

All submissions require pull requests.

Required for merge:

1. CI is green.
2. Issue is linked.
3. At least one explicit approval from project administration/maintainers.
4. PR is merged by project administration/maintainers.

Repository administrators must enforce this with branch protection rules on protected branches.

## Dependency policy

There is a high bar for dependency changes.

If a release needs new core runtime behavior:

1. update and release/publish `treegress-browser-core` first
2. then bump pinned core dependency in this repo
3. publish MCP package

## Security and conduct

- Security reports: see `SECURITY.md`.
- Community behavior: see `CODE_OF_CONDUCT.md`.
