# SelectiveCI

selectiveci-action

SelectiveCI is a GitHub Action that adds a **decision layer** in front of your CI.

It decides **whether CI should run**, and **what area is impacted**, based on
changed files in a pull request.

SelectiveCI does not run tests.
It does not replace your CI.
It only decides **mode and targets**.

---

WHAT PROBLEM DOES IT SOLVE

CI pipelines waste time and money when:

- Docs-only PRs trigger full CI
- Monorepos run everything for small changes
- Risky paths (infra, workflows, security) are not treated differently

SelectiveCI prevents unnecessary CI runs while remaining **safe by default**.

---

CORE IDEA

SelectiveCI works in three concepts:

1. **Areas**
2. **Policies**
3. **Mode (decision)**

You configure **areas and safety rules**.
SelectiveCI evaluates the PR and outputs a **mode**.

---

DECISION MODES

SelectiveCI produces exactly one of these modes:

- skip  
  CI can be safely skipped (for example: docs-only changes)

- selective  
  CI should run only for specific impacted areas

- full  
  CI must run fully due to risk or uncertainty

Mode is an **output**, not a configuration.

---

HOW IT WORKS

Pull Request  
↓  
SelectiveCI analyzes changed files  
↓  
Policies are applied  
↓  
Decision is produced  
↓  
Your existing CI uses that decision

---

CONFIGURATION (.selectiveci.yml)

Create a file named `.selectiveci.yml` in your repository.

Example:

version: "1.1"

workspaces:
  roots:
    - "services/**"
    - "docs/**"
    - "README.md"
  strategy: "folder-2"

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

WHAT THIS CONFIG MEANS

- Changes only in docs → CI is skipped
- Changes inside defined workspaces → selective mode
- Changes in safety paths → full CI enforced
- Anything unclear → safe fallback to full CI

---

USING SELECTIVECI IN YOUR CI

Add this step to any existing workflow:

- name: SelectiveCI Decision
  id: sc
  uses: KiAi-dev/selectiveci-action@v1
  with:
    config-path: .selectiveci.yml

That is the only place SelectiveCI is referenced.

---

USING THE DECISION

Gate your CI using the decision:

if: needs.selectiveci.outputs.mode != 'skip'

You may optionally use targets for selective execution.

---

OUTPUTS (PHASE-1 CONTRACT)

SelectiveCI exposes these stable outputs:

- mode  
  skip | selective | full

- targets  
  Comma-separated impacted areas

- targets_json  
  JSON array of impacted areas

- reasons  
  JSON array of reason codes

- fallback  
  true | false (whether safety fallback was used)

These outputs are deterministic and safe to consume.

---

EXAMPLES

Docs-only change:

mode: skip  
targets:  
fallback: false  

Single service change:

mode: selective  
targets: services/api  

Workflow or infra change:

mode: full  
targets: all  

---

IMPORTANT NOTES

- SelectiveCI does not enforce how you run tests
- Mapping targets to commands is intentionally left to you
- This keeps SelectiveCI language-agnostic and CI-tool-agnostic

---

DESIGN PRINCIPLES

- Deterministic decisions
- Safe-by-default escalation
- Transparent reasoning
- Zero coupling to test frameworks

---

SUMMARY

You already have CI.

SelectiveCI simply decides **when it should run**,  
**what it should run for**,  
and **when to stay out of the way**.

---

LICENSE

MIT © SelectiveCI
