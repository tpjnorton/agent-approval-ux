# Demo

One scripted agent run, rendered two ways.

```bash
pnpm install
pnpm dev
```

- `/before`: the typical approval card. Tool name, raw JSON, amber badge, modal per call, auto-approve on timeout.
- `/after`: the same run through the skill's rules, using `DecisionCard` from `skills/agent-approval-ux/examples/shared/`.

No model is called. `lib/scenario.ts` holds the run.

`pnpm dev` and `pnpm build` both run `pnpm sync` first, which copies the skill's shared component into `lib/skill/`. That folder is generated and gitignored, so edit the source in `examples/shared/` and never the copy.
