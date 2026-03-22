# Upgrading

## From monorepo path installs

Old install:

```yaml
- uses: NORNR/AIAGENTSCRYPTO/.github/actions/nornr-budget-shield@main
```

New install:

```yaml
- uses: NORNR/nornr-budget-shield@v1
```

## Upgrade rule

- use `@v1` for stable installs
- move to a newer major only when you want new behavior defaults
- keep `.nornr-pr-audit.json` in repo root unless you explicitly pass `config-path`
