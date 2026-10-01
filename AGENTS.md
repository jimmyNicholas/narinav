# Narinav

A collaborative storytelling game for kids: the player builds a story one sentence at a time with Claude. Next.js (App Router) + TypeScript + Tailwind. Rebuilt from Story Buddy (Voiceflow); the originals live in `reference/` for layout only. See `PLAN.md` for background.

## Agent skills

### Issue tracker

Issues and tickets live in GitHub Issues on `jimmyNicholas/narinav`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Git workflow

- `main` is the live app: cPanel deploys it, and it must keep working while Narinav is rebuilt. Never commit to `main` directly.
- Do each piece of work (one ticket, one fix) on its own branch from `main`, and merge it through a pull request.
- Keep rebuild work off `main` until it is ready to replace the current app.
