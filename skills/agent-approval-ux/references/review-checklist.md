# Review checklist

Walk this top to bottom against the component and the code that builds its payload. Every failed item is a finding. Severity is fixed per item so two reviewers reach the same ranking.

Output format per finding:

```
[Severity] Rule broken
Consequence for the human, one line.
Fix: one concrete change.
```

End the review with the three changes that would most improve the decision, in order.

If the component uses its own risk scheme (low/medium/high, `dangerous: boolean`), map it before scoring: anything permanent, or touching money, people, production or external parties, is consequential for every item below.

## Critical: the gate fails open or grants silently

- [ ] No auto-approve on timeout, inactivity or dismissal.
- [ ] No code path where an unrecognised state, error or missing prop resolves to approved.
- [ ] "Always allow", if present, does nothing until the human explicitly enables it, and enabling it is visible.
- [ ] Nothing approves on Enter, Space or Escape when the card first renders on a consequential gate.

## High: a required field or structural rule is missing

- [ ] The action is stated in one imperative sentence with verb, count, object and system.
- [ ] The systems touched are named in the human's vocabulary.
- [ ] Reversibility is shown as one of `undoable`, `undoable with effort`, `permanent`. Never blank.
- [ ] Risk level is accompanied by a stated reason.
- [ ] Risk level is derived from the arguments of this call, not only from the tool name.
- [ ] Reads and pre-authorised action classes are not gated.
- [ ] The surface does not block unrelated work (no full-screen modal, no click-swallowing backdrop).
- [ ] Rejection does not require a reason.
- [ ] "Always allow" is scoped to a named action class and shows where to revoke it.
- [ ] Timeout, if any exists, resolves to deferred, never rejected.
- [ ] Edit and approve is offered when any argument is editable.
- [ ] Defer is offered when the run could continue without the answer.

## Medium: the human can decide, but worse than they should

- [ ] Evidence (why) is available and links to the real tool output rather than a paraphrase.
- [ ] Evidence is expanded by default when risk is consequential.
- [ ] Arguments are collapsed by default and editable inline where the schema allows.
- [ ] Confidence, if shown, is categorical and backed by a real signal. No invented percentages.
- [ ] Cost is shown when the action spends money or metered credits.
- [ ] Multiple pending gates render as one list with receipts alongside, not stacked modals.
- [ ] Bulk approve excludes Notable and Consequential.
- [ ] Queue position is shown when more than one gate is pending.
- [ ] Copy names the object and count. No "Are you sure?", "Continue?", "Proceed?".
- [ ] No countdown timer, type-to-confirm, or hold-to-approve that the user did not ask for.

## Low: polish

- [ ] Approve and Reject are distinguishable without colour.
- [ ] One key expands the evidence section.
- [ ] Tool name, model name and internal ids appear only inside the collapsed arguments.
- [ ] Buttons show a pending state after click and cannot double-submit.
- [ ] Escape and backdrop click leave the decision untouched.
- [ ] Dark mode, if the app has one, keeps the consequential treatment legible.

## What not to recommend

These are common reviewer reflexes. They make the surface worse and contradict the rules.

- Adding a countdown or visible timer.
- Changing auto-approve to auto-reject. Both are wrong. Defer.
- Adding type-to-confirm or hold-to-confirm to "make it safer".
- Making the rejection reason required "to capture data".
- Adding a fifth button (Skip, Ask again later, Approve all) outside the four actions.
- Expanding the raw JSON by default "for transparency". Transparency is the action sentence and the evidence link.
