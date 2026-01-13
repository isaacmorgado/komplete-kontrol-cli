---
name: commit
description: Run quality checks, commit with AI message, and push
---

Run quality checks before committing:

```bash
bun run typecheck && bun run lint
```

Fix ALL errors before continuing. No exceptions.

Review changes with `git status` and `git diff --cached`.

Generate a commit message:
- Start with verb: Add/Update/Fix/Remove/Refactor/feat/fix/chore
- Be specific and concise (one line preferred)
- Follow conventional commits if applicable

Commit and push:
```bash
git add -A
git commit -m "your generated message"
git push
```
