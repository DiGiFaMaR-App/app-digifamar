# GitKraken MCP (example) — Integrating Claude to produce edits (edts)

This document explains the example GitKraken MCP manifest included at `.gitkraken/mcp.yaml` and how to use it as a starting point for integrating an AI (for example, Anthropic "Claude") to generate edits ("edts") for this repository.

## What this adds

- `.gitkraken/mcp.yaml` — an example manifest that documents a theoretical MCP integration point named `claude` and an action `generate_edits` that can be triggered to propose code changes.
- `docs/GITKRAKEN_MCP.md` — this documentation file (you are reading it).

> Note: This is an example/template for documentation and automation. It is not an official or validated GitKraken MCP spec. Adapt fields and formats to match the MCP schema you are using.

## Goal

Allow an external AI service ("Claude") to:
- Receive a natural language request to modify the codebase.
- Generate a set of edits (a unified diff or patch).
- Validate and apply the edits on a new branch and open a pull request.

## High-level flow (recommended)

1. A user or automation triggers the MCP webhook/event `mcp.generate_edits`. The trigger payload should include:
   - A short human prompt describing the requested change.
   - Optional files/paths to focus on.
   - Scope (e.g., `src/`, `docs/`).
2. An external service (hosted by you) receives the webhook and:
   - Clones the repository (or uses a lightweight checkout of the focused files).
   - Builds a prompt combining repository context (relevant files/snippets), the user request, and any repo policies.
   - Calls Claude (Anthropic API) using a secret-stored API key to produce a patch (unified diff preferred).
   - Runs automated checks: lint, typecheck, tests, and a safety/sanitization step.
   - If checks pass, create a branch (e.g., `ai/claude/auto-edits-YYYYMMDD-HHMM`) and commit the patch.
   - Open a Pull Request against the default branch with a clear description and the AI-generated rationale.

## Recommended secrets and permissions

- Store the Claude API key as a secret (example name used in the manifest: `GITKRAKEN_CLAUDE_API_KEY`).
- The service that applies patches needs a Git credential with write access (prefer a deploy key or a GitHub App installation token limited to this repo).
- If running as a GitHub Action, add the Claude API key to the repository or organization secrets.

## Example prompt template for Claude

```
You are an automated code assistant. The repository files below are provided for context. Make only the changes requested in the instruction. Output a unified diff in standard format with file headers and line ranges. Do not include extra commentary or explanation—only the patch.

Context files:
<insert relevant file contents here>

Instruction:
{user_instruction}
```

Replace `{user_instruction}` with the user's natural-language request (for example: "Fix type errors in src/utils/date.ts and add unit tests for edge cases").

## Example safety checks (suggested)

- Run TypeScript type-check: `pnpm/ npm / yarn` script (repo-dependent).
- Run linting: ESLint.
- Run unit tests.
- Prefer a human review step for any edits that touch sensitive subsystems (auth, billing, infra).

## Optional: GitHub Actions example (do not install automatically)

Below is an example Action you can adopt: the Action invokes a custom script that calls Claude, validates the patch, and opens a PR. This is a conceptual snippet — do not paste it into the repo unless you want the automation active.

```yaml
# Example conceptual workflow (NOT INCLUDED IN THIS repo by default)
name: ai/claude-generate-edits
on:
  workflow_dispatch:
    inputs:
      instruction:
        required: true
        type: string
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run AI generator
        env:
          CLAUDE_API_KEY: ${{ secrets.GITKRAKEN_CLAUDE_API_KEY }}
        run: |
          # run a script that sends files and instruction to Claude, receives a patch
          # validate patch, apply, run tests, and push a branch + open PR
          python .github/scripts/claude_generate_and_apply.py "${{ github.event.inputs.instruction }}"

```

## Next steps — how I can help

- If you want, I can add a GitHub Actions workflow (example) that implements the above flow — I will prompt you for where to store secrets and whether to run on the default branch or a feature branch.
- I can also provide example scripts (Node.js or Python) that call Anthropic Claude, produce a unified diff, validate changes, and push a PR.

---

If you'd like me to proceed and add an optional workflow or example implementation script (Python/Node), tell me which language and whether you want the automation to run on-demand (workflow_dispatch) or on a schedule/webhook.
