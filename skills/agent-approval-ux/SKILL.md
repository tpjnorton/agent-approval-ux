---
name: agent-approval-ux
description: Use when building or reviewing the UI where a human approves, rejects or edits an AI agent's action. Triggers on human-in-the-loop, tool approval, confirmation cards, permission prompts, consent dialogs, interrupts, "requires approval", needsApproval / toolApproval, addToolApprovalResponse, useHumanInTheLoop, renderAndWaitForResponse, AG-UI interrupts, LangGraph interrupt(), MCP elicitation or destructiveHint, or any component that renders a tool call with Approve and Reject buttons. Also use when asked to audit, critique or improve an existing approval flow.
license: MIT
metadata:
  author: tpjnorton
  version: "0.1.0"
---

# Agent approval UX

Opinionated rules for the moment a human decides about an agent's action. Two modes. **Generate**: you are writing the decision surface. **Review**: you are auditing one that exists. Stack-agnostic; the framework only supplies the plumbing.

Core principle: the human has about five seconds. A raw tool call, a coloured badge and two buttons produce a click, not a decision. Every element on the surface must earn its place against that clock.

Read `references/rationale.md` when you need the argument behind a rule. Read `references/schema.json` for the payload and `references/response.schema.json` for what the surface returns. Read `references/copy-guide.md` before writing any user-facing text. Read `references/review-checklist.md` in review mode.

## Mode selection

- The user is building, adding, wiring or generating an approval, confirmation, permission or HITL surface: **Generate mode**.
- The user points you at an existing component, flow, screenshot or PR and asks for feedback, a review, an audit or improvements: **Review mode**.
- Both: review first, then generate the fix.

## 1. When to gate at all

Gate an action only when all three hold:

1. It has an effect outside the agent's sandbox: writes, sends, deletes, spends, publishes.
2. It is not trivially reversible.
3. The human has not pre-authorised this class of action.

Otherwise run it and show a receipt (what ran, on what, result, undo if available).

Hard rules:

- Never gate reads. `github_read_file`, `search`, `list`, `get`: run them. If an MCP tool carries `readOnlyHint: true`, do not gate it.
- Never gate spend below the user's set floor.
- Never gate the same action twice in one run unless new information arrived.
- When in doubt whether something is reversible, gate it and label it `undoable-with-effort`.

Risk classification is per instance, from the arguments, by the agent. A lookup table keyed on tool name is a fallback for unknown tools, never the primary mechanism. `slack_post_message` to a private test channel is routine; to `#all-hands` it is consequential.

## 2. Required fields on the decision surface

In this order of visual priority. Fields 1 to 3 are REQUIRED and always visible. Missing any of them is a review finding at severity High.

| # | Field | Rule |
|---|---|---|
| 1 | **Action** | One plain imperative sentence: verb, count, object, system. "Delete 14 invoices older than 2019 from Stripe." If it needs two sentences, split the gate or refuse to gate. |
| 2 | **Where** | Systems touched, by the name the human uses. "Stripe", not `stripe_api_v2`. |
| 3 | **Reversibility** | Exactly one of `undoable`, `undoable with effort`, `permanent`. Never blank. Never inferred by the reader from a colour. |
| 4 | **Why** | The evidence the agent relied on. Collapsed by default. Links or expands to the actual tool output, not a paraphrase. Expanded by default when risk is consequential. |
| 5 | **Confidence** | Only when the agent has a real signal. Categorical: `routine`, `unusual for this context`, `agent is uncertain`. Never a percentage the agent invented. |
| 6 | **Cost** | Spend so far this run and estimate for this action, when known. |
| 7 | **Arguments** | Raw parameters. Collapsed by default. Editable inline where the schema allows. Tool name, model name and internal ids live here and nowhere else. |

## 3. Actions available to the human

Exactly these four. No fifth button.

| Action | Rule |
|---|---|
| **Approve** | Label names the object when space allows: "Delete 14 invoices". Never the default focused control on a consequential gate. |
| **Reject** | Reason is optional free text. Never required. Never a modal within a modal. |
| **Edit and approve** | Inline edit of the arguments, then approve. Offer it whenever any argument is editable. Read-only JSON throws this away. |
| **Defer** | Park the decision. The agent continues with work that does not depend on it, or waits if nothing else can proceed. Deferred is the only timeout outcome. |

"Always allow" is permitted only as a secondary control, scoped to a named action class ("Post to #ops in Slack"), never to a raw tool name, with a visible revoke path from the card. A checkbox with no revoke path is a review finding at severity High.

## 4. Risk taxonomy

Three levels. Defined by consequence. The agent assigns the level and MUST state the reason next to it.

| Level | Definition | Treatment |
|---|---|---|
| **Routine** | Reversible, inside expected scope, low spend | Neutral. No colour. |
| **Notable** | Reversible with effort, or unusual for this context, or moderate spend | One accent. One line saying why it is notable. |
| **Consequential** | Permanent, or touches money, people, production or external parties | Strong treatment. Why section expanded by default. Approve requires a deliberate action and is not the default focus. |

Format: `Consequential: sends email to 340 external recipients.` A level without a reason is decoration and a review finding.

Do not add friction beyond the rules above (type-to-confirm, countdown timers, hold-to-approve) unless the user asks. Friction the human does not understand trains the click-through you are trying to prevent.

## 5. Batching

- Multiple gates in one turn render as one list, not a stack of modals.
- Siblings that need no approval run immediately and appear as receipts in the same list.
- Bulk approve is available for Routine only. Notable and Consequential are decided one at a time.
- Show queue position when more than one gate is pending.

## 6. Timing and attention

- A gate never blocks the whole UI. No full-screen modal, no backdrop that swallows clicks. Render in the stream or a side panel so the human can check what they need to check before deciding.
- Nothing auto-approves on timeout. Nothing auto-rejects on timeout. Timeout means deferred.
- No countdown timers. Time pressure produces clicks, not decisions.
- If more than 5 gates are pending (configurable), the agent stops and summarises before adding more.

## 7. Accessibility and copy

- Approve and Reject are never distinguished by colour alone. Use position, label and weight.
- Keyboard: one key expands the evidence. Consequential approve needs explicit confirmation; Enter on a freshly rendered card never approves.
- Copy is imperative and names the object and count. "Send 3 emails to the Finance team?" Never "Are you sure?" or "Continue?".
- Model names, tool names and internal ids never appear as primary text. Collapsed arguments only.
- Escape and backdrop click do nothing to the decision. They do not reject.

See `references/copy-guide.md` for patterns and rewrites.

## Generate mode

1. Build the payload first, using the shape in `references/schema.json`. If you cannot fill `action`, `where` and `reversibility` from what the framework gives you, add them at the point the agent decides to gate (tool metadata, a wrapper, or a system prompt instruction), not in the component.
2. Decide per instance whether the action needs a gate at all (section 1). Reads and pre-authorised classes become receipts.
3. Render fields in the priority order in section 2. Fields 1 to 3 always visible. 4 and 7 collapsed unless consequential.
4. Wire the four responses in section 3 to the framework's callback. Where the callback only accepts a boolean, send the edited arguments through the framework's side channel (AI SDK: `options.body` plus `experimental_refineToolInput` on the server; CopilotKit: the `respond` payload; MCP: the `arguments` of the retried call) and approve. Defer is no call: leave the part pending.
5. Apply the risk treatment in section 4 and state the reason.
6. Check every rule in `references/review-checklist.md` against your own output before returning it.

Stack notes and full examples: `examples/ai-sdk/`, `examples/ag-ui/`, `examples/mcp/`.

## Review mode

Default posture: flag, do not praise. Approval is earned.

1. Read the component and any code that constructs its props or payload.
2. Walk `references/review-checklist.md` top to bottom. Every failed item is a finding.
3. If the component uses its own risk scheme (low/medium/high, a boolean `dangerous`), map it before scoring: anything permanent, or touching money, people, production or external parties, counts as consequential.
4. Rank findings by severity: **Critical** (auto-approve, gates that fail open, silent permission grants), **High** (missing required field, blocking modal, required rejection reason, no revoke path, missing defer or edit path where the run or schema allows it), **Medium** (copy, collapsed state wrong, missing evidence, batching), **Low** (polish).
5. For each finding give: the rule broken, one line on the consequence for the human, one concrete fix.
6. Do not recommend adding friction, timers, or auto-reject on timeout as fixes. The fixes are in this file.
7. End with the three changes that would most improve the decision, in order.

## Anti-patterns

Flag every one of these in review. Never produce them in generate.

- Raw JSON as the decision surface.
- Risk colour or label with no stated reason.
- Missing or blank reversibility.
- Confirmation copy without object and count ("Are you sure?").
- Approve as the default focused button on a consequential action.
- Modal that blocks unrelated work.
- Auto-approve or auto-reject on timeout. Countdown timers.
- Gating reads or pre-authorised classes.
- Reason field required for rejection.
- "Always allow" with no visible revoke path, or scoped to a raw tool name.
- Risk assigned by tool-name lookup rather than from the arguments.
- Tool name, model name or internal id as the headline.
- Confidence shown as an invented percentage.
- No edit path when arguments are editable. No defer path when the run could continue.
- Bulk approve that includes Notable or Consequential gates.

## Rationalisations to refuse

| You are thinking | Reality |
|---|---|
| "The framework only gives me a boolean, so four actions is impossible" | Edit-and-approve is approve plus the edited input sent on a side channel the framework already has (request body, resume payload, respond argument). Defer is not calling back yet. See `examples/` for each stack. |
| "Timing out to reject is the safe default" | It punishes the human for stepping away and forces the agent to replan around a no nobody gave. Defer. |
| "Type DELETE to confirm makes it safer" | Unexplained friction trains click-through. State the consequence and remove default focus instead. |
| "Reads are cheap to gate, better safe than sorry" | Every needless gate spends attention the consequential gate needs. Never gate reads. |
| "A per-tool risk table is good enough" | The same tool is routine or consequential depending on arguments. Classify per instance. |
| "A required reason on reject captures useful data" | It makes yes the path of least resistance. Optional only. |
| "Reversibility is implied by the risk colour" | Nobody knows what amber means. Write the word. |
| "The demo has one tool, batching does not matter" | Write the list renderer anyway. The second tool arrives next sprint. |
