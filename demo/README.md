# Demo

One scripted agent run, rendered two ways.

```bash
npm install
npm run dev
```

- `/before`: the typical approval card. Tool name, raw JSON, amber badge, modal per call, auto-approve on timeout.
- `/after`: the same run through the skill's rules, using `DecisionCard` from `skills/agent-approval-ux/examples/shared/`.

No model is called. `lib/scenario.ts` holds the run.
