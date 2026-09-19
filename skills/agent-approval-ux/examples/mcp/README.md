# MCP example

MCP gives a client two signals and one channel:

- **Tool annotations** on the server's tool definition: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. The spec says clients MUST treat them as untrusted unless the server is trusted. Use them as a floor for the gate decision, never as the whole answer.
- **Elicitation** (`elicitation/create`) if the server itself wants to ask the human something mid-call, with a three-action response: `accept`, `decline`, `cancel`.
- The spec's own guidance: there SHOULD be a human in the loop able to deny tool invocations, and clients SHOULD show tool inputs before calling.

What the rules add on the client side:

1. **Gate decision from annotations plus arguments.** `readOnlyHint: true` → never gate (§1). `destructiveHint: false, idempotentHint: true` → routine, receipt only. Otherwise the model, which chose the call, writes the decision payload before the client sends `tools/call`.
2. **The payload comes from the model, not the client.** Ask the model to emit an `ApprovalDecision` alongside each gated call (a structured-output step, or a sidecar tool). The client validates it against `references/schema.json` and refuses to render a gate that is missing `action`, `where`, `reversibility` or `risk.reason`. Fall back to an honest "the agent could not describe this action" card.
3. **Responses map cleanly.** Approve → send `tools/call`. Edit and approve → send `tools/call` with edited `arguments`. Reject → do not call, return a tool result to the model saying the human declined and why. Defer → hold the call; keep processing other calls in the same turn.
4. **Elicitation from the server** is rendered with the same card body, with the server's name in the `where` field (the spec requires clients to make clear which server is asking). `accept` → approve, `decline` → reject, `cancel` → defer.

File: `approval-gate.ts` (no framework dependency, typechecked 2026-09-19), a transport-agnostic gate you put between the model's tool call and the MCP client's `callTool`.
