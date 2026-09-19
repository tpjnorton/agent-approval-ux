# AG-UI / CopilotKit example

CopilotKit's `useHumanInTheLoop` is the React face of an AG-UI interrupt. The hook registers a frontend "tool"; when the agent calls it, `render` runs with `status === "executing"` and a `respond` callback. Under the hood the run finishes with `outcome: { type: "interrupt" }` and your response goes back in the `resume` array of the next `RunAgentInput`.

Two things the rules change:

1. **The interrupt carries the decision payload.** Give the agent a tool whose parameters *are* `ApprovalDecision` (action, where, reversibility, risk with reason, arguments). The agent fills them when it decides to gate. The card only renders. This is the "agent, not a keyword list, assigns the level" rule made structural: the schema will not accept a level without a reason.
2. **Four responses through one `respond`.** `respond()` takes any JSON, so send the full `ApprovalResponse`. The agent branches on `response`. For `defer`, do not call `respond` at all; the interrupt stays open and the agent's other branches continue if the graph allows it.

Batching: CopilotKit renders one `render` per tool call, in message order, inside the chat stream. That is already a list, not a modal stack. Do not wrap it in a Dialog.

File: `ApprovalGate.tsx`. Typechecked against `@copilotkit/react-core@1.73` (the `/v2` entry point) and `zod@4` on 2026-09-19. The legacy root export of `useHumanInTheLoop` takes a `Parameter[]` array instead of a schema; use `/v2`.
