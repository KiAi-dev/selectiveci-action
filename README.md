# 🚦 SelectiveCI

**selectiveci-action**

GitHub Action wrapper for **SelectiveCI** — a decision layer for safer, faster, and cheaper CI.

Run only what matters. Skip the rest.

---

## What Is SelectiveCI?

SelectiveCI is a **CI decision engine** for pull requests.

It analyzes the files changed in a PR and decides **how CI should run**:

- `skip` – safely skip CI (documentation-only changes)
- `selective` – run CI only for impacted areas
- `full` – enforce full CI for risky or unclear changes

SelectiveCI **does not replace your CI**. 

It adds a **decision layer before CI execution**.

---

## What Problem Does It Solve?

CI pipelines waste time and money when:

- Documentation-only PRs still trigger full CI
- Monorepos run every job for small changes
- Risky paths (infra, workflows, security) are not treated differently

SelectiveCI prevents unnecessary CI runs while remaining **safe by default**.

---

## What SelectiveCI Is (and Is Not)

### SelectiveCI IS
- A GitHub Action
- A decision engine
- Language-agnostic (Python, Java, Node, Go, etc.)
- CI-tool-agnostic

### SelectiveCI IS NOT
- A test runner
- A CI pipeline template
- A framework you must adopt

You keep your existing CI.  

SelectiveCI only tells it **when** and **what** to run.

---

## How It Works

Pull Request  
↓  
SelectiveCI analyzes changed files  
↓  
Policies are applied  
↓  
Decision is produced (`skip` | `selective` | `full`)  
↓  
Your existing CI consumes that decision

---

## Configuration (`.selectiveci.yml`)

Create a file named `.selectiveci.yml` in your repository.

SelectiveCI uses an **areas + policy** configuration model.
Each area represents a logical ownership or risk boundary (for example: docs, services, CI/security).

- You define **areas** (named groups of paths)
- Each area has a **policy** (`skip`, `selective`, or `full`)
- SelectiveCI detects which areas are impacted by the PR and decides the final mode


### Example

```yaml
version: 1

areas:
  docs:
    paths:
      - "README.md"
      - "docs/**"
      - "**/*.md"
    policy: skip

  services:
    paths:
      - "services/**"
    policy: selective

  ci_security:
    paths:
      - ".github/**"
      - "infra/**"
      - "security/**"
    policy: full
```

Note: A policy expresses **intent**, not execution.

SelectiveCI does not run tests.

It only decides the CI mode and reports impacted areas.
Your CI workflow is responsible for executing jobs based on this decision.



## Minimum Required Configuration

You must define at least one area under `areas`.
If no area matches a PR change, SelectiveCI **defaults to `full`** to preserve safety.

### What SelectiveCI Does NOT Use
SelectiveCI intentionally ignores:
- CI commands
- Test definitions
- Job graphs
- Build steps

The configuration defines **decision intent only**, not execution.

---


## How Decisions Are Made

SelectiveCI evaluates impacted areas using these rules:

- If the git diff fails, the decision is `full` (safe fallback).
- If any impacted area has policy `full`, the decision is `full`.
- If all impacted areas have policy `skip`, the decision is `skip`.
- Otherwise, the decision is `selective`.

If multiple areas are impacted in a single PR, policies are resolved safely:

- `full` overrides all other policies
- `skip` applies only when *all* impacted areas are `skip`
- otherwise, the decision is `selective`
  
Notes:
- `targets` are the **area names** (keys under `areas:`), not file paths
- Your CI is responsible for mapping area names to commands or jobs


## Using SelectiveCI in Your CI

Add this step to **any existing workflow**:

```yaml
- name: SelectiveCI Decision
  id: sc
  uses: KiAi-dev/selectiveci-action@v1
  with:
    config-path: .selectiveci.yml
```

---

## Gating Your CI

```yaml
if: needs.selectiveci.outputs.mode != 'skip'
```

---
## Outputs (Phase-1 Stable Contract)

SelectiveCI exposes deterministic outputs:

- `mode`
  One of: `skip`, `selective`, `full`

- `targets`
  Comma-separated impacted area names (only meaningful when mode is `selective`)

- `targets_json`
  JSON array of impacted area names (only meaningful when mode is `selective`)

- `reasons`
  JSON array of reason codes for the decision
  (e.g. documentation-only change, policy-enforced full run, diff fallback).
  They are intended for debugging, auditability, and CI visibility.

- `fallback`
  `true` or `false` (safe fallback used, e.g. diff failure)

---

### Reason Codes

SelectiveCI emits machine-readable reason codes:

- `DOCS_ONLY` – only documentation files changed
- `CODE_CHANGE` – code areas impacted
- `POLICY_FORCE_FULL` – an area explicitly enforces full CI
- `UNKNOWN_FILE_TYPE` – files did not match any configured area
- `DIFF_FAIL` – git diff failed (safe fallback)

These are intended for debugging, auditability, and CI visibility.

--- 
## Pattern Support

For safety and predictability, SelectiveCI supports **only** the following path pattern forms:

- Exact file match (example: `README.md`)
- Directory prefix match (example: `docs/**`)
- File extension match (example: `**/*.md`)

Other glob patterns are intentionally unsupported to keep decisions deterministic.


## Safety and Security

SelectiveCI is designed to be safe by default.

- Any uncertainty results in `full` CI
- Diff failures automatically trigger fallback
- High-risk areas can be explicitly enforced as `full`

This ensures SelectiveCI never weakens CI guarantees.
Note: SelectiveCI computes an internal risk level (`low`, `medium`, `high`) to guide safe escalation, but this value is not currently exposed as an output.

## Design Principles

- Deterministic
- Safe-by-default
- Transparent reasoning
- Language-agnostic
- CI-tool-agnostic

---

## Summary

SelectiveCI is the **missing decision layer** in modern CI pipelines.

You already have CI.  
SelectiveCI just makes it smarter.


## LICENSE

MIT © SelectiveCI
