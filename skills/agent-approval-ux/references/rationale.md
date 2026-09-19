# Rationale

Why each rule exists, with the sources it leans on. SKILL.md is the instruction; this is the argument. Read it when a rule feels arbitrary or a user pushes back.

This is an opinion with evidence, not a standard. Rules change by argument in an issue.

## The framing

Every framework has shipped the plumbing for the approval moment:

- AI SDK: tool approval via `toolApproval` on `generateText` / `streamText` (the older `needsApproval` on `tool()` still works), surfaced in `useChat` as tool parts in state `approval-requested`, resolved with `addToolApprovalResponse({ id, approved })`. https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
- CopilotKit: `useHumanInTheLoop({ name, description, parameters, render })` where `render` receives `{ args, status, respond }` and `status === "executing"` is the decision moment. https://docs.copilotkit.ai/reference/hooks/useHumanInTheLoop
- AG-UI: `RunFinished` with `outcome: { type: "interrupt", interrupts: [...] }`, resumed by a new run whose `RunAgentInput` carries a `resume` array. https://docs.ag-ui.com/concepts/events
- Microsoft Agent Framework's AG-UI integration handles sibling tool calls in the same turn, which is where the batching rules come from. https://learn.microsoft.com/agent-framework/
- LangGraph: `interrupt()` inside a node, resumed with `Command(resume=...)`.
- MCP: tool annotations `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`; the spec says clients SHOULD present confirmation prompts and show tool inputs before calling. Elicitation gives a three-action model (`accept`, `decline`, `cancel`) and requires clients to make clear which server is asking. https://modelcontextprotocol.io/specification/latest/server/tools and https://modelcontextprotocol.io/specification/latest/client/elicitation
- MUI X `ChatConfirmation`, agenttrace-ui, Agent Approval Card, shadcn.io `ai-tool-approval`, 21st.dev `tool-approval`: at least five open-source React components that render the card.

None of these answer the design question. The card they all produce is a tool name, raw JSON, a coloured badge and two buttons. This skill is the missing judgment layer. It sits on top of any of them.

Prior art on AI interaction patterns, cited as catalogues rather than sources for specific rules: Shape of AI (shapeof.ai), Google PAIR Guidebook (pair.withgoogle.com/guidebook), Microsoft HAX Toolkit (microsoft.com/en-us/haxtoolkit), IBM Carbon for AI (carbondesignsystem.com/guidelines/carbon-for-ai). Google's A2UI framing of agent-generated UI as "safe like data, expressive like code" is the closest statement of why a declarative decision payload beats a free-form rendering.

The reviewer posture (flag by default, approval is earned) is borrowed from Emil Kowalski's motion skill on skills.sh, which is the clearest example of taste-as-a-skill working in the directory.

## 1. When to gate

**Three conditions.** Gating is a withdrawal from a small attention account. Every gate the human does not need makes the one they do need cheaper to click through. The habituation effect is well documented for security warnings: users who see many warnings stop reading any of them. Approval cards are security warnings with a nicer font.

**Never gate reads.** Reads have no effect outside the sandbox, so condition 1 fails by definition. MCP marks these with `readOnlyHint: true`. The baseline test for this skill (an agent with no rules) gated `github_read_file` with a full card and an "Allow read" button. That is the failure this rule exists for.

**Spend floor.** Users can set a number they do not care about. Below it, a receipt is enough. SmartAsk's per-turn ledger is a natural home for the floor; the `cost` field maps directly onto it.

**Never twice without new information.** Re-asking about the same action teaches the human that the agent does not remember, and that their answer does not stick. Either becomes a reason to stop reading.

**Per-instance classification.** A tool-name table is what every baseline produces, because it is easy. It is also wrong in both directions: `slack_post_message` to a test channel does not need a gate, `slack_post_message` to `#all-hands` is consequential. The agent has the arguments. It should use them.

## 2. Required fields

**The action sentence.** A sentence forces the agent to have understood what it is doing. JSON does not. The human's job is to check the agent's understanding, so the agent's understanding is what must be on the card. The one-sentence limit is a scope check: an action that needs two sentences is two decisions.

**Where.** People reason about consequence by system. "Stripe" carries meaning ("that's money"). `stripe_api_v2` carries none for anyone outside the team.

**Reversibility, never blank.** The question the human is really answering is "what happens if this is wrong?" Reversibility is the direct answer. It is one word and it is the single most decision-relevant fact available. Both baseline agents in this skill's tests (one generating, one reviewing) omitted it entirely, which is why it is a REQUIRED structural field rather than a suggestion. Three labels because a binary hides the middle ("technically recoverable via a support ticket") and more than three is not decidable in five seconds.

**Why, linked not paraphrased.** An agent that paraphrases its own evidence is grading its own homework. The link to raw tool output lets a doubtful human check. Collapsed by default because most decisions do not need it; expanded for consequential because those do.

**Confidence, categorical, only if real.** Models produce fluent percentages that mean nothing, and people trust numbers. A category the agent can justify ("unusual for this context: first delete in this run") is honest. An invented "87%" is theatre.

**Cost.** Money is one of the four consequential triggers and the only one with a unit. If the agent knows the spend, hiding it is a choice.

**Arguments collapsed, editable.** The raw parameters are the audit trail, not the decision. They belong on the card, but under the fold. Editable because a read-only argument view turns a fixable mistake into a rejection and a round trip.

## 3. Four actions

**Approve, Reject.** Obvious.

**Edit and approve.** The action that turns a gate into a collaboration. The agent got the recipient list right and the subject wrong; the human fixes the subject and continues. Every framework accepts edited input one way or another (AI SDK: approve with the part's input replaced upstream or a follow-up message; CopilotKit: `respond()` with the edited args; AG-UI: the `resume` payload; MCP elicitation: `content`).

**Defer.** The one nobody builds. Without it every gate is a hard block, and a hard block on a task the human was delegating produces one behaviour: approve to make it go away. Defer is also the only honest timeout outcome (see section 6).

**Reject reason optional.** A required text field between the human and "no" makes "yes" the path of least resistance. That is the opposite of a safety control. The baseline reviewer for this skill saw the required field and flagged the empty-string edge case as a bug, not the requirement as the flaw. That is exactly the blind spot this rule closes.

**No fifth button.** Each extra option costs decision time and dilutes the four. "Skip", "Ask again later", "Approve all" are all Defer or bulk approve wearing a different label.

**Always allow, scoped and revocable.** Silent permanent grants are how a helpful checkbox becomes an incident. Scoping to an action class (not a tool name) keeps the grant meaningful to the human. A visible revoke path is the difference between a permission and a trap. MCP's elicitation spec requires "clear decline and cancel options" for the same reason.

## 4. Risk taxonomy

**Three levels by consequence.** Low/medium/high by vibes is what every baseline produces. Nobody can say what "medium" means. Defining the levels by consequence (reversibility, scope, spend, and the four consequential triggers: money, people, production, external parties) makes them decidable.

**Reason required.** A colour without a reason is decoration. A reason without a colour is still useful. Requiring the reason also forces the agent to articulate the consequence, which is itself a check on the agent's understanding.

**Approve not the default focus on consequential.** A person hitting Enter out of habit should not delete anything. Both baselines got this right, which is encouraging. The rule stays because the shadcn-style components mostly do not.

**No extra friction.** Type-to-confirm, countdown timers and hold-to-approve are reviewer reflexes. They feel safer. What they do is add work the human does not understand, which is the precise recipe for habituation. GitHub's repo-delete pattern works because it happens once a year. An agent gate happens twenty times a day. The baseline generator added type-DELETE friction and the baseline reviewer recommended a countdown. This rule exists because both instincts are common and both are wrong for this frequency.

## 5. Batching

Microsoft Agent Framework's AG-UI integration and AI SDK's multi-step tool calls both produce several tool calls in one turn. Stacking modals for them is the default and the worst option: the human sees one decision at a time with no view of the whole. A list with receipts alongside shows the turn as the agent saw it. Bulk approve for Routine only, because the whole point of the Notable and Consequential levels is individual attention.

## 6. Timing

**Never block the UI.** A full-screen modal over an agent workspace means the human cannot check the thing they need to check before deciding. The baseline component under review used `fixed inset-0` with a backdrop; the baseline reviewer did not flag it. It is on the checklist at High because it is common and invisible to reviewers.

**Nothing on timeout.** Auto-approve is consent by exhaustion. Auto-reject is safer and still wrong: it punishes the human for going to make tea and forces the agent to replan around a "no" nobody gave. The baseline reviewer's fix for auto-approve was auto-reject. Deferred is the only outcome that respects the human's absence.

**Pending ceiling.** Past about five open decisions, a queue stops being triage and becomes a backlog. The agent should stop and summarise. Five is a default; the number is less important than the existence of a ceiling.

## 7. Accessibility and copy

**Never colour alone.** Red/green is the most common colour-vision deficiency. Position, label and weight cost nothing.

**Imperative copy naming the object.** "Are you sure?" is a question about the human's emotional state. "Send 3 emails to the Finance team?" is a question about the action. Only one of them can be answered by reading the card.

**No tool or model names as headline.** They are meaningful to the engineer who wrote the tool and to nobody else. They belong in the audit trail (collapsed arguments), where the engineer will look.

**Escape does nothing.** In MCP elicitation, dismissal is `cancel`, distinct from `decline`. The same distinction matters here: closing a card is not a decision, and treating it as one (either way) puts words in the human's mouth.

## What this skill deliberately leaves out (v1)

Receipts and undo as a first-class surface, multi-agent triage, and attention policy learning (which classes a given user always approves). They are v2 and v3. The reversibility field points at them: the more actions are `undoable`, the fewer gates are needed at all, and approval as a pattern may shrink as undo gets cheaper. That is fine. The rules on reversibility and receipts already point at that future.
