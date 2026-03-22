# Marketplace Copy

## Release title

NORNR Budget Shield v1.0.2 - Review-first PR guardrail for consequential execution

## Release notes

NORNR Budget Shield is the review-first GitHub Action for consequential execution.

It comments on pull requests when new payment, tool, MCP, or vendor-action surfaces appear without an explicit NORNR control story.

Why teams install it:

- show up inside the pull request before risky runtime power reaches `main`
- keep review language calm and actionable instead of noisy
- point to the likely NORNR lane before the merge hardens the path

Best fit:

- agent runtimes
- tool-using copilots
- MCP servers
- browser automation with paid or risky actions
- AI workflows that can touch vendors, billing, or real budgets

Install:

```yaml
- uses: NORNR/nornr-budget-shield@v1
  with:
    severity: review-first
```

Related NORNR surfaces:

- Governance Audit: https://nornr.com/governance-audit
- PR Comment Audit explainer: https://nornr.com/pr-comment-audit
- MCP control layer: https://nornr.com/mcp-control-server
