# Copy guide

User-facing text on a decision surface. Short, imperative, names the object.

## The action sentence

Pattern: **Verb + count + object + qualifier + system.**

| Weak | Strong |
|---|---|
| Tool call requires approval | Delete 14 invoices older than 2019 from Stripe |
| The assistant wants to call sendgrid_send_campaign | Send the Q3 reminder to 340 people on the Finance list |
| Confirm action | Post a message to #ops in Slack |
| Execute stripe_refund? | Refund $1,240.00 to 3 customers in Stripe |
| Proceed with changes? | Update 27 product prices in Shopify |

Rules:

- Present-tense imperative. No "wants to", no "is about to", no "would like to".
- Always a count when more than one object is touched. "3 emails", not "emails".
- The system by its human name, at the end.
- One sentence. If a second one is needed, the gate is too big.
- No tool names, function names, model names or ids. They go in the collapsed arguments.

## Reversibility labels

Use exactly these three strings, no synonyms:

- `Undoable`
- `Undoable with effort`
- `Permanent`

Optional one-line qualifier after the label, for `Undoable with effort` and `Permanent` only:

- "Undoable with effort. Stripe keeps deleted invoices for 30 days; restore is a support ticket."
- "Permanent. Recipients will have the email before you can recall it."

## Risk line

Pattern: **Level: reason.** The reason is the consequence, in the same vocabulary as the action.

- "Routine: reversible edit to a draft."
- "Notable: first time this run has written to production."
- "Consequential: sends email to 340 external recipients."
- "Consequential: spends $412 with no undo."

Never a level on its own. Never a level explained by the tool name ("High: destructive tool").

## Confidence

Only if real. Three strings:

- "Routine for this task."
- "Unusual for this context." Follow with what is unusual: "Unusual for this context: the agent has not deleted from Stripe before in this run."
- "Agent is uncertain." Follow with why: "Agent is uncertain: two invoices matched the date filter but have open disputes."

Never a percentage. Never "high confidence" as a default.

## Buttons

| Action | Label pattern | Example |
|---|---|---|
| Approve | Verb + count + object when it fits in ~24 characters, else "Approve" | "Delete 14 invoices", "Send to 340 people", "Approve" |
| Reject | "Reject" or "Don't" + verb | "Reject", "Don't send" |
| Edit and approve | "Edit" as the affordance on the arguments, then the approve label | "Edit" then "Send to 12 people" |
| Defer | "Decide later" | "Decide later" |

Never "Yes" / "No". Never "OK" / "Cancel". Never "Continue".

## Evidence header

- "Why the agent chose this" as the collapsed header.
- Each item: source name, count or size, link. "Stripe invoice search, 14 results" → opens the raw output.

## Receipts (actions that ran without a gate)

Pattern: **Past tense + count + object + system + undo affordance.**

- "Read 3 files from the repo."
- "Posted to #ops-test in Slack. Undo"
- "Created draft 'Q3 reminder' in SendGrid. Undo"

## Always allow

- Checkbox label: "Always allow: post to #ops in Slack". Names the class, not the tool.
- Beneath it, always visible: "Change this in Settings → Agent permissions" (or the app's real path).

## Deferred state

- "Waiting for your decision. The agent is continuing with other work."
- Or, if it cannot continue: "Waiting for your decision. The agent is paused."

## Words to avoid

"Are you sure", "Continue", "Proceed", "OK", "Confirm" (as a headline), "The AI", "The model", "Execute", "Invoke", "Tool", "Function", "Payload", "Params".
