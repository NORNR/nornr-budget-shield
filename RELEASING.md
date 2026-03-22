# Releasing NORNR Budget Shield

Use this sequence for public releases:

1. verify the monorepo dogfood workflow still passes
2. prepare the public mirror:

```bash
npm run mirror:budget-shield
```

3. sync the mirror into the public `NORNR/nornr-budget-shield` repo
4. create a release tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

5. move the major tag:

```bash
git tag -f v1
git push origin v1 --force
```

6. create the GitHub release from `v1.0.0`
7. publish the release in GitHub Marketplace from the release UI

## Marketplace draft

Use this title pattern:

```text
NORNR Budget Shield v1.0.2 - Review-first PR guardrail for consequential execution
```

Use the prepared copy in:

- [`MARKETPLACE.md`](./MARKETPLACE.md)

Keep the release notes short, install-first, and concrete:

- what it comments on
- who should install it
- one install snippet
- links to Governance Audit and MCP as the next NORNR surfaces

## Marketplace rule

Keep the public action repo clean:

- `action.yml` in repo root
- no workflow files in that public action repo
- examples belong in `examples/`, not in `.github/workflows/`
