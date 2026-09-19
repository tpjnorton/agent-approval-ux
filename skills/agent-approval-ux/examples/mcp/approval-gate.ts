import type { ApprovalDecision, ApprovalResponse } from "../shared/types";

/** Subset of MCP ToolAnnotations. Untrusted unless the server is trusted. */
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean; // default false
  destructiveHint?: boolean; // default true
  idempotentHint?: boolean; // default false
  openWorldHint?: boolean; // default true
}

export interface PendingCall {
  callId: string;
  serverName: string; // the human-facing name, e.g. "Stripe"
  toolName: string;
  arguments: Record<string, unknown>;
  annotations?: ToolAnnotations;
  /** Written by the model when it chose the call. May be absent or invalid. */
  proposedDecision?: Partial<ApprovalDecision>;
  trustedServer?: boolean;
}

export type GateOutcome =
  | { kind: "run"; call: PendingCall; receipt: string }
  | { kind: "gate"; decision: ApprovalDecision };

/**
 * §1: decide whether this call needs a human at all.
 * Reads never gate. Idempotent non-destructive calls run with a receipt.
 * Everything else gates, with the model's payload if it is complete, or an honest fallback.
 */
export function gate(call: PendingCall, preauthorised: (actionClass: string) => boolean): GateOutcome {
  const a = withDefaults(call.annotations, call.trustedServer ?? false);

  if (a.readOnlyHint) {
    return { kind: "run", call, receipt: `Read from ${call.serverName}.` };
  }
  if (!a.destructiveHint && a.idempotentHint && !a.openWorldHint) {
    return { kind: "run", call, receipt: `Updated ${call.serverName}. Undo available.` };
  }

  const d = complete(call.proposedDecision, call);
  if (d.alwaysAllow && preauthorised(d.alwaysAllow.actionClass)) {
    return { kind: "run", call, receipt: d.action.replace(/^(\w+)/, (v) => pastTense(v)) };
  }
  return { kind: "gate", decision: d };
}

/** Map the human's response to what the MCP client should do next. */
export type NextStep =
  | { do: "call"; arguments: Record<string, unknown> }
  | { do: "decline"; toolResultForModel: string }
  | { do: "hold" };

export function apply(response: ApprovalResponse, call: PendingCall): NextStep {
  switch (response.response) {
    case "approve":
      return { do: "call", arguments: call.arguments };
    case "edit-and-approve":
      return { do: "call", arguments: response.editedArguments ?? call.arguments };
    case "reject":
      return {
        do: "decline",
        toolResultForModel: `The user declined "${call.toolName}" on ${call.serverName}${response.reason ? `: ${response.reason}` : "."} Do not retry without new information.`,
      };
    case "defer":
      return { do: "hold" }; // §6: the only timeout outcome is also this one
  }
}

/** Server-initiated elicitation maps onto the same card and the same four responses. */
export function elicitationToResponseAction(r: ApprovalResponse): "accept" | "decline" | "cancel" {
  if (r.response === "approve" || r.response === "edit-and-approve") return "accept";
  if (r.response === "reject") return "decline";
  return "cancel";
}

// Spec defaults: destructive and open-world are assumed true when absent. Untrusted servers get the same defaults
// regardless of what they claim, so a hostile server cannot mark a delete as read-only.
function withDefaults(a: ToolAnnotations | undefined, trusted: boolean): Required<Omit<ToolAnnotations, "title">> {
  if (!trusted) return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };
  return {
    readOnlyHint: a?.readOnlyHint ?? false,
    destructiveHint: a?.destructiveHint ?? true,
    idempotentHint: a?.idempotentHint ?? false,
    openWorldHint: a?.openWorldHint ?? true,
  };
}

/** Accept the model's payload only if the required fields are present. Otherwise say so on the card. */
function complete(p: Partial<ApprovalDecision> | undefined, call: PendingCall): ApprovalDecision {
  const ok =
    p && typeof p.action === "string" && Array.isArray(p.where) && p.where.length > 0 && p.reversibility && p.risk?.level && p.risk?.reason;
  const internal = { server: call.serverName, tool: call.toolName, callId: call.callId };
  if (ok) {
    return {
      id: call.callId,
      action: p.action!,
      where: p.where!,
      reversibility: p.reversibility!,
      risk: p.risk!,
      why: p.why,
      confidence: p.confidence,
      cost: p.cost,
      arguments: { values: call.arguments, editable: p.arguments?.editable, internal },
      availableResponses: p.availableResponses ?? ["approve", "reject", "edit-and-approve", "defer"],
      alwaysAllow: p.alwaysAllow,
    };
  }
  return {
    id: call.callId,
    action: `Run an action on ${call.serverName} that the agent did not describe.`,
    where: [call.serverName],
    reversibility: "undoable-with-effort",
    risk: { level: "notable", reason: "the agent gave no description of the consequence" },
    arguments: { values: call.arguments, internal },
    availableResponses: ["approve", "reject", "defer"],
  };
}

function pastTense(verb: string): string {
  const v = verb.toLowerCase();
  const irregular: Record<string, string> = { send: "Sent", delete: "Deleted", post: "Posted", update: "Updated", create: "Created", run: "Ran" };
  return irregular[v] ?? `${verb}ed`;
}
