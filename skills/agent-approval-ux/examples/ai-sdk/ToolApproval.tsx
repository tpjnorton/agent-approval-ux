"use client";

// Renders every approval-requested tool part in one assistant message as one list (§5),
// with receipts for sibling tool calls that ran without a gate.
// Typechecked against ai@7 / @ai-sdk/react@3.

import { isDataUIPart, isStaticToolUIPart, type UIMessage, type ToolUIPart, type ChatAddToolApproveResponseFunction } from "ai";
import { DecisionCard } from "../shared/DecisionCard";
import type { ApprovalDecision, ApprovalResponse } from "../shared/types";

type Props = {
  message: UIMessage;
  addToolApprovalResponse: ChatAddToolApproveResponseFunction;
};

const CEILING = 5; // §6 pending-gates ceiling

export function ToolApprovals({ message, addToolApprovalResponse }: Props) {
  const toolParts = message.parts.filter(isStaticToolUIPart);
  // The server wrote one `data-approval` part per gate, keyed by toolCallId (see route.ts).
  const decisions = new Map<string, ApprovalDecision>();
  for (const p of message.parts) {
    if (isDataUIPart(p) && p.type === "data-approval" && p.id) decisions.set(p.id, p.data as ApprovalDecision);
  }

  const gates = toolParts.filter((p) => p.state === "approval-requested" && decisions.has(p.toolCallId));
  const receipts = toolParts.filter((p) => p.state === "output-available");
  if (gates.length === 0 && receipts.length === 0) return null;

  const shown = gates.slice(0, CEILING);
  const hidden = gates.length - shown.length;

  function respond(part: ToolUIPart, r: ApprovalResponse) {
    if (part.state !== "approval-requested") return;
    const id = part.approval.id;
    switch (r.response) {
      case "approve":
        addToolApprovalResponse({ id, approved: true });
        break;
      case "edit-and-approve":
        // §3: approve, and ship the edited input to the server in the request body.
        // route.ts applies it with experimental_refineToolInput before execution.
        addToolApprovalResponse({
          id,
          approved: true,
          reason: "approved with edits",
          options: { body: { edits: [{ toolName: toolName(part), original: part.input, edited: r.editedArguments }] } },
        });
        break;
      case "reject":
        addToolApprovalResponse({ id, approved: false, reason: r.reason });
        break;
      case "defer":
        // No call. The part stays approval-requested and sendAutomaticallyWhen keeps waiting.
        break;
    }
  }

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {receipts.map((p) => (
        <p key={p.toolCallId} className="text-sm text-zinc-500">
          {receiptLabel(p)}
        </p>
      ))}
      {shown.map((p, i) => (
        <DecisionCard
          key={p.toolCallId}
          decision={{ ...decisions.get(p.toolCallId)!, pending: { position: i + 1, total: gates.length } }}
          onRespond={(r) => respond(p, r)}
        />
      ))}
      {hidden > 0 ? <p className="text-sm">{hidden} more decisions are waiting. Answer these first.</p> : null}
    </div>
  );
}

function toolName(p: ToolUIPart): string {
  return p.type.replace(/^tool-/, "");
}

/** Receipts: past tense, count, object, system. Tool names stay out of the primary text. */
function receiptLabel(p: ToolUIPart): string {
  const name = toolName(p);
  const input = (p.input ?? {}) as Record<string, unknown>;
  if (name === "github_read_file") return `Read ${String(input.path)} from the repo.`;
  if (name === "slack_post_message") return `Posted to ${String(input.channel)} in Slack.`;
  return `Ran a step (${name}).`;
}
