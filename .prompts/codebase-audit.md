# Codebase Audit Prompt

Use this prompt when you want an agent to audit this repository without making changes.

## Prompt

```text
Audit this repository as a senior staff engineer. Do not make code changes unless I explicitly ask.

Context:
- This is Dashboard.Gold, a React Router 7 + Bun + Convex + Tailwind v4 + TypeScript app.
- Read `TASKS.md` first, then `AGENTS.md`. Note the task system: `TASKS.md` is a priority-ordered index (Now / Epics / Up Next / Later / Testing). `.epics/<name>.md` files hold detailed plans.
- If you inspect Convex code, also read `convex/AGENTS.md` and `convex/_generated/ai/guidelines.md`.
- Use relevant audit frameworks/skills if available for:
  - React Router framework mode
  - React best practices / performance
  - Convex performance and best practices

Audit goals:
- File and code organization
- Composition patterns
- Repo optimization for agents
- React best practices
- Convex best practices
- Performance concerns
- Testing issues and gaps

Instructions:
- Ground every finding in actual source files.
- Prefer high-signal findings over long generic advice.
- Call out both strengths and weaknesses.
- Separate immediate risks from later cleanup.
- Flag any docs drift or agent-confusing repo conventions.
- Do not suggest large refactors without explaining why they matter.

Output format:
1. Executive summary
2. What's working well
3. Findings by category
4. Top 5 highest-priority fixes
5. Suggested tasks for `TASKS.md`, categorized by section:
   - **Now** — only if it's urgent and the list has room (max 3)
   - **Up Next** — ready-to-do bugs, refactors, improvements (one-liners)
   - **Later** — ideas, not yet prioritized
   - **Testing** — coverage gaps or test infrastructure
   - **New epic?** — flag if a finding warrants a new `.epics/<name>.md` file (3+ sessions of work)

For each finding include:
- Severity: high / medium / low
- Why it matters
- Evidence: file paths
- Recommended direction (not full implementation unless asked)
```

## Notes

- This prompt is tuned for this repo’s current stack and conventions.
- It is intentionally audit-only and asks the agent to avoid implementation by default.
- If you want a stricter version later, we can add required output tables, scoring, or a pass/fail checklist.
