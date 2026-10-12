<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## AI-Assisted Development

- Prefer the simplest correct implementation. Choose the approach that is easiest to understand and maintain unless a strong technical reason supports another choice.
- Follow the existing project architecture and conventions before introducing new patterns. Do not add advanced patterns, abstractions, libraries, or architecture without a clear need.
- Keep changes small and focused. Avoid combining unrelated features or refactoring unrelated code into one task.
- Prefer readable code over clever code. Do not hide important logic behind excessive helper layers or abstractions. Comments should explain non-obvious decisions, not obvious syntax.
- Do not over-engineer code because AI makes it easy to do so.
- Before implementing, briefly explain the planned flow and the files likely to change. If a change would touch many files or introduce significant complexity, stop and explain why before proceeding.
- When a task uses an important Next.js or React concept, briefly identify the concept to understand before or after implementation.
- After implementation, provide a concise, practical explanation suitable for someone learning through the project:
  - What changed.
  - The main data/request flow.
  - The 3–5 most important files to review.
  - Any important Next.js/React concept used.
  - What to test manually.
- Testing must verify the feature, but passing tests alone is not enough; keep the implementation understandable and explain how to review it.

## Learning Mode

Use this workflow for implementation tasks:

**Plan → identify concepts to learn → implement → explain flow → review key files → manual test**

The goal is to let AI accelerate development while keeping the codebase understandable and reviewable. The developer does not need to implement everything manually; agents should make the work clear enough to learn from and confidently review.
