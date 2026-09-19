# How the skill was tested

The rules were written against observed failures, then re-run. Same two tasks each time, fresh agent, Sonnet-class model.

**Task A (generate):** build an approval component for an AI SDK app whose agent can read a GitHub file, post to Slack, send a SendGrid campaign to 340 people, and delete 14 Stripe invoices.

**Task B (review):** review a typical approval card (tool name headline, raw JSON, low/medium/high badge, full-screen modal, required rejection reason, auto-approve after 30 seconds, dead "always allow" checkbox).

## Without the skill

| | Generate | Review |
|---|---|---|
| Gated the read | Yes, with an "Allow read" button | Not flagged |
| Reversibility | Absent | Never mentioned |
| Risk | Per-tool-name table | Flagged colour without reason |
| Actions | Approve, Deny | Flagged nothing about missing Defer or Edit |
| Timeout | n/a | Recommended auto-reject and a countdown timer |
| Rejection reason | n/a | Flagged the empty-string edge case as a bug, not the requirement as the flaw |
| Blocking modal | n/a | Not flagged |
| Extra friction | Added type-DELETE-to-confirm | n/a |

## With the skill

| | Generate | Review |
|---|---|---|
| Gated the read | No, rendered as a receipt | Flagged at High |
| Reversibility | Present, always visible | Flagged at High |
| Risk | Per instance from arguments, reason stated | Flagged at High, mapped low/medium/high onto the taxonomy |
| Actions | All four, no fifth | Missing Defer and Edit flagged |
| Timeout | None | Auto-approve flagged Critical; fix was "remove it", not "make it reject" |
| Rejection reason | Optional | Requirement flagged at High |
| Blocking modal | In-stream section | Flagged at High |
| Extra friction | None added | Not recommended |

## What the tests changed in the skill

- Reversibility became a REQUIRED structural field rather than a suggestion.
- Missing Defer and Edit paths moved from Medium to High, for consistency with "exactly four actions".
- A mapping note was added for components that use their own risk scheme.
- The claim that edit-and-approve "fits a boolean API" was corrected. AI SDK's approval callback takes a boolean and a reason, so the edited input travels in the request body and is applied on the server with `experimental_refineToolInput`. The example shows this.
- `response.schema.json` is now linked from SKILL.md; the test agent found it only by listing the directory.

## Type checks

The three stack examples were typechecked on 2026-09-19 against `ai@7`, `@ai-sdk/react@3`, `@copilotkit/react-core@1.73` (`/v2` entry point) and `zod@4`. The MCP example has no framework dependency.
