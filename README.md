# NORNR Budget Shield

GitHub Action for one specific job:

comment on a pull request when new tool, payment, MCP, or vendor-action surfaces appear without an explicit NORNR control story.

This is not a generic lint rule.
It is a review-first control layer for consequential execution while the merge is still cheap.

## Why teams install it

Use Budget Shield when you want NORNR to show up:

- inside the pull request
- before runtime power quietly reaches `main`
- before new spend or vendor paths become normal by accident

It is best for teams building:

- agent runtimes
- tool-using copilots
- MCP servers
- browser automation with paid or risky actions
- AI workflows that can touch vendors, billing, or real budgets

## What it flags

- payment or checkout surfaces
- tool or MCP surfaces
- external provider or vendor actions

The output is intentionally calm:

- which file changed
- what kind of consequential surface appeared
- which NORNR lane or control path likely fits before merge

## Install in 60 seconds

```yaml
name: NORNR Budget Shield

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: NORNR/nornr-budget-shield@v1
        with:
          severity: review-first
```

## Optional config

Budget Shield looks for `.nornr-pr-audit.json` in the target repository root.

Start with this:

```json
{
  "severity": "review-first",
  "exclude": ["tests/", "docs/"],
  "rules": [
    {
      "id": "payments",
      "label": "Payment or settlement surface",
      "pattern": "stripe|checkout|invoice|billing|transfer|wallet\\.send",
      "suggestion": "Route the new spend path through one NORNR lane before merge so review, counterparty posture and finance packet stay explicit."
    }
  ]
}
```

Full example: [`.nornr-pr-audit.json.example`](./.nornr-pr-audit.json.example)

## Inputs

- `node-version`
  - Default: `22`
- `config-path`
  - Default: `.nornr-pr-audit.json`
- `severity`
  - Default: `advisory`

## Example PR comment

```md
### NORNR PR audit

This pull request appears to introduce consequential execution surfaces that may deserve an explicit NORNR lane before merge. Audit posture: review-first.

- `src/runtime/payments.ts` — Payment or checkout surface, External provider or vendor action
  - `const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);`
  - Suggested next step: Consider browser checkout governance, finance close packet or a vendor-procurement lane before this merges ungoverned.
```

## How to think about it

Budget Shield is strongest when it stays narrow:

- diagnostic first
- review-first language
- one suggested control story

It is not trying to block every merge.
It is trying to stop teams from accidentally widening runtime authority without noticing.

## Related NORNR surfaces

- Governance Audit: [nornr.com/governance-audit](https://nornr.com/governance-audit)
- PR Comment Audit explainer: [nornr.com/pr-comment-audit](https://nornr.com/pr-comment-audit)
- MCP control layer: [nornr.com/mcp-control-server](https://nornr.com/mcp-control-server)

## Release discipline

- pin production installs to `@v1`
- create semver tags for every public release
- keep the action narrow enough that teams trust the comment and do not mute it

See [RELEASING.md](./RELEASING.md) and [UPGRADING.md](./UPGRADING.md).
