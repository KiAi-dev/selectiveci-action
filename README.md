# 🚦 SelectiveCI

# selectiveci-action 
GitHub Action wrapper for SelectiveCI — decision layer for safer, faster, cheaper CI.

<p align="center">
  <b>Run only what matters. Skip the rest.</b>
</p>

SelectiveCI is a **CI decision engine** for pull requests.

It analyzes the files changed in a PR and decides **how CI should run**:
- **skip** → safely skip CI (docs-only changes)
- **selective** → run CI only for impacted parts
- **full** → enforce full CI for risky changes

SelectiveCI **does not replace your CI**.  
It adds a **decision layer before CI execution**.

---

## What Problem Does SelectiveCI Solve?

CI pipelines waste time and money when:
- Documentation-only PRs still trigger full CI
- Monorepos run every job for small changes
- Risky paths (infra, workflows, security) are not treated differently

SelectiveCI prevents unnecessary CI runs while remaining **safe by default**.

---

## What SelectiveCI Is (and Is Not)

### ✅ SelectiveCI IS
- A **GitHub Action**
- A **decision engine**
- Language-agnostic (Python, Java, Node, Go, etc.)
- CI-tool-agnostic

### ❌ SelectiveCI IS NOT
- A test runner
- A CI pipeline template
- A framework you must adopt

> You keep your existing CI.  
> SelectiveCI only tells it **when** and **what** to run.

---

## How SelectiveCI Works

```
Pull Request
     ↓
SelectiveCI analyzes changed files
     ↓
Decision:
  • skip
  • selective
  • full
     ↓
Your existing CI runs accordingly
```

---

## Outputs (Stable v1 Contract)

SelectiveCI exposes deterministic outputs:

| Output | Description |
|------|------------|
| `selectiveci_mode` | `skip` \| `selective` \| `full` |
| `selectiveci_targets` | Impacted folders / services |
| `selectiveci_reasons` | Reason codes for the decision |
| `selectiveci_risk` | `low` \| `medium` \| `high` |
| `selectiveci_fallback` | Whether safety fallback was used |

These outputs are consumed by **your CI**, not executed by SelectiveCI.

---

## Example Decisions

### Docs-only PR
- mode: `skip`
- risk: `low`
- CI is skipped safely

### Single service change
- mode: `selective`
- targets: `services/api`
- Only relevant CI runs

### Workflow / infra / security change
- mode: `full`
- targets: `all`
- Full CI enforced automatically

---

## Integration Overview (IMPORTANT)

SelectiveCI **does not require you to copy a CI workflow**.

You only do **two things**:

1. Add a configuration file  
2. Call SelectiveCI from **your existing CI workflow**

---

## Step 1: Add Configuration

Create `.selectiveci.yml` in your repo:

```yaml
version: "1.1"

workspaces:
  roots:
    - "src/**"
    - "packages/**"
    - "docs/**"
  strategy: "folder-1"

safety:
  force_full_paths:
    - ".github/**"
    - "infra/**"
    - "security/**"

docs:
  docs_only_patterns:
    - "README.md"
    - "docs/**"
    - "**/*.md"
```

This file defines:
- What counts as docs-only
- Which paths are risky
- How targets are derived

---

## Step 2: Plug SelectiveCI into Your Existing CI

Inside **any existing CI workflow** (filename does NOT matter):

```yaml
- name: SelectiveCI Decision
  id: sc
  uses: KiAi-dev/selectiveci-action@v1
  with:
    config-path: .selectiveci.yml
```

That’s the **only place** your repo is referenced.

---

## Step 3: Gate Your CI (One Line)

Wherever your CI runs:

```yaml
if: needs.selectiveci.outputs.selectiveci_mode != 'skip'
```

Nothing else changes.

---

## Optional: Target-aware CI (Advanced)

If you want selective execution:
- Read `selectiveci_targets`
- Decide how to map targets to commands

This is optional and language-specific.

---

## Supported Languages

SelectiveCI works with:
- Python
- Java
- Node.js
- Go
- Monorepos & polyrepos

Because it **only makes decisions**, not executions.

---

## Why Enterprises Use SelectiveCI

- 💸 Reduced CI cost
- ⚡ Faster PR feedback
- 🔒 Safe-by-default escalation
- 🧠 Deterministic decisions
- 🧩 Fits existing pipelines

---

## Design Principles

- Deterministic (no magic)
- Safe escalation
- Transparent reasoning
- Language-agnostic
- CI-tool-agnostic

---

## Summary

> **SelectiveCI is the missing decision layer in modern CI pipelines.**

You already have CI.  
SelectiveCI just makes it smarter.

---

## License

MIT (or your chosen license)
