# AI SDK example

Vercel AI SDK tool approval, rendered through the rules. Typechecked against `ai@7.x`, `@ai-sdk/react@3.x`, `zod@4.x` on 2026-09-19. On `ai@6`, the opt-in is `needsApproval` on `tool()` instead of `toolApproval` on `streamText`; the UI side is the same.

How the plumbing works:

- The server decides per call whether approval is needed. In the UI stream the tool part arrives with `state: "approval-requested"` and `part.approval.id`.
- The client resolves it with `addToolApprovalResponse({ id, approved, reason?, options? })`.

What the rules add, and where each one lives:

1. **Gate decision per instance, on the server.** `toolApproval: ({ toolCall }) => ...` returns `"not-applicable"` for reads and pre-authorised classes. `github_read_file` never reaches the client as a gate.
2. **The decision payload rides alongside.** The approval request only carries an id and a reason, so the server writes one `data-approval` part per gate, keyed by `toolCallId`, through `createUIMessageStream`'s writer. The client joins it to the tool part. The component only renders.
3. **Four responses on a boolean API.** Approve → `approved: true`. Reject → `approved: false`, reason optional. Edit and approve → `approved: true` with the edited input in `options.body.edits`; the server applies it with `experimental_refineToolInput` before execution. Defer → no call. The part stays pending, and `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses` will not fire until every gate in the message has an answer.
4. **Batching** falls out of the message model: every gate in one assistant message renders as one list, receipts beside it.

Files:

- `route.ts`: server. `describe()` is the one place that decides whether to gate and what the human sees.
- `ToolApproval.tsx`: client. Joins tool parts to their decision payloads and renders `DecisionCard`.
