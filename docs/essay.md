# Stop rendering JSON and calling it consent

Every agent framework now ships the same moment. The agent wants to do something with consequences, so it stops and asks. AI SDK calls it tool approval. CopilotKit calls it human in the loop. AG-UI calls it an interrupt. LangGraph, MUI X, and a handful of shadcn registries have their own names. Under the hood they all do the same thing: pause, hand a payload to the UI, wait for a boolean.

And the UI, almost everywhere, looks like this. A card. A title that says "Tool call requires approval". A code block with the raw arguments in JSON. An amber badge that says MEDIUM. Two buttons. Sometimes a checkbox that says "Always allow".

I've counted at least five open-source React components that render exactly this. They're all fine pieces of engineering. The plumbing works. What's missing is any sign that someone asked what the human on the other side needs in order to decide well. The whole market has proven demand by building the same widget five times, and none of those five has produced the judgment.

That's what this essay is about. Approval UX has a design problem, and the design problem has a fairly small set of answers. You can fit them on one page. Here they are.

## The human has five seconds

Start from the reader's situation. Someone is running an agent because they don't want to do the work themselves. They've delegated. Now the agent has stopped, and it's asking them to re-engage with a task they were trying to avoid. They'll give it about five seconds of real attention. After that, they're clicking through.

So the card has one job: make a good decision possible in five seconds. Everything on it has to earn its place against that clock.

Raw JSON fails the test immediately. `{"olderThan": "2019-01-01", "ids": [...14 items]}` is a data structure. It isn't a sentence. A human has to parse it, infer what the tool does from its name, count the array, and work out what "olderThan" means for a deletion. That's cognitive work the agent should have done already. It knows what it's about to do. It should say so.

**Rule one: the action, in one plain sentence.** "Delete 14 invoices older than 2019 from Stripe." If the agent can't say it in one sentence, the action is too big to gate as a single decision. Split it.

Notice what that sentence contains. A verb. A count. An object. A system. That's the minimum a person needs to picture the consequence. Compare it with "Are you sure you want to continue?", which contains none of those and is somehow still the most common confirmation copy on the internet.

## Reversibility is the whole question

When you approve something, the question you're really answering is "what happens if this is wrong?" If the answer is "I press undo", you can afford to skim. If the answer is "340 people have already received the email", you cannot.

Almost no approval card tells you which world you're in. The amber badge is meant to, but nobody knows what "medium" means. Medium what? Medium likelihood the agent is confused? Medium blast radius? Medium according to a keyword list that flagged the word "delete"?

**Rule two: a reversibility label, always.** Three values are enough: *undoable*, *undoable with effort*, *permanent*. Never blank. It's the single most decision-relevant fact about an action and it costs one word.

**Rule three: risk levels defined by consequence, with the reason stated.** Routine, notable, consequential. Consequential means permanent, or it touches money, people, production, or external parties. And the card must say why. "Consequential: sends email to 340 external recipients." A colour without a reason is decoration. A reason without a colour would still be useful.

This matters for a second reason. If the agent has to write the reason, the agent has to think about it. Forcing the model to articulate consequence is a better safety check than any badge.

## Show the evidence, don't paraphrase it

Agents act on things they've read. The human approving the action should be able to see what the agent saw. Most cards skip this entirely, and the ones that include it usually paraphrase: "Based on the invoice data, these appear to be stale." That's the agent grading its own homework.

**Rule four: link to the tool output, collapsed by default.** The raw search result, the file contents, the API response. Let the human expand it if they doubt the agent. For consequential actions, expand it by default. Nobody should be able to send 340 emails without at least scrolling past the list they're sending to.

On confidence: only show it if the agent has a real signal. "87% confident" is almost always invented, and people trust invented numbers. Prefer categories the agent can actually justify: *routine*, *unusual for this context*, *agent is uncertain*.

## Four actions, and only four

Approve. Reject. Edit and approve. Defer.

Approve and reject are obvious. Edit and approve is the one that turns a gate into a collaboration. The agent got the recipient list right and the subject line wrong; let the human fix the subject inline and continue, without a round trip through chat. Every card that shows arguments as read-only JSON is throwing this away.

Defer is the one nobody builds. It says "not now, keep going with other things." Without it, every gate is a hard block, and a hard block on a task the human was avoiding produces exactly one behaviour: click approve to make it go away.

Reject should never require a reason. Forcing a text field between the human and "no" makes "yes" the path of least resistance. That's the opposite of what a safety control should do. Offer the field. Don't demand it.

And "Always allow", if you must ship it, gets scoped to a named class of action, never to "this tool", and comes with a visible way to revoke it. A checkbox that silently grants permanent permission to a tool called `stripe_delete_invoices` is not a feature.

## Stop gating things that don't need it

The fastest way to teach a person to click approve without reading is to ask them to approve things that don't matter. Reads. Idempotent writes. A two-cent API call. Every unnecessary gate is a withdrawal from the attention account, and the account is small.

**Rule five: gate only when all three hold.** The action has an effect outside the sandbox. It isn't trivially reversible. The human hasn't already authorised this class of thing. Otherwise, run it and issue a receipt.

Never gate reads. Never gate below a spend floor the user set. Never ask twice about the same thing in one run without new information.

This has a corollary for batching. When an agent's turn produces six actions and two need approval, render two cards in one list and four receipts alongside them. Don't stack six modals. And bulk approve is for routine actions only. Notable and consequential ones get decided one at a time, because the point of the gate is the individual attention.

## Nothing happens on timeout

A card sits unanswered for thirty seconds. What should happen?

Several components auto-approve. The reasoning is that the human is clearly fine with it, or they'd have said. This is consent by exhaustion. Others auto-reject, which is safer and still wrong: it punishes the human for going to make tea and forces the agent to re-plan around a "no" nobody said.

**Rule six: the only timeout outcome is deferred.** The card waits. The agent continues with whatever it can do without the answer. When the human comes back, the decision is still there, still theirs.

The same logic says a gate must never block the whole interface. A full-screen modal over an agent's workspace means the human can't check the thing they'd need to check in order to decide. Render the card in the stream, or in a side panel, and let the rest of the app keep working.

## The small things that aren't

Approve and reject are never distinguished by colour alone. Some of your users can't see the difference, and all of them will eventually click the wrong one when the layout shifts. Use position, label, and weight.

On a consequential action, approve is never the default focused button. The person who hits Enter out of habit should reject, or nothing, not delete.

Model names, tool names, and internal IDs don't go in the primary text. Nobody outside your team knows what `sendgrid_send_campaign` is, and nobody at all cares that it was gpt-4.1 who suggested it. Put those in the collapsed arguments where an engineer can find them.

## Why a skill

I've put these rules into an Agent Skill, a file coding agents read when they build or review this kind of UI. It has a generate mode, which produces conforming approval surfaces in whatever stack you're using, and a review mode, which audits an existing flow and lists what's wrong, ranked by severity.

The reason it's a skill and not a component is distribution. A component is the sixth widget. A spec needs people to read it, agree, and implement it, which is the whole problem in miniature. A skill is a spec whose reader is the agent that's already writing your approval card. Drop it in the repo and the generated code conforms without anyone deciding to adopt a standard.

It's opinionated. Some of the opinions are probably wrong, and I'd like to hear which. The rules change by argument in an issue. What won't change is the premise: rendering JSON and calling it consent isn't good enough, and the agent asking for permission is perfectly capable of asking better.
