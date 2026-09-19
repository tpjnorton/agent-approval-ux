/**
 * TypeScript mirror of references/schema.json and response.schema.json.
 * Keep the two in sync; the JSON is the source of truth.
 */

export type Reversibility = "undoable" | "undoable-with-effort" | "permanent";
export type RiskLevel = "routine" | "notable" | "consequential";
export type Confidence = "routine" | "unusual-for-context" | "agent-uncertain";
export type ResponseKind = "approve" | "reject" | "edit-and-approve" | "defer";

export interface Evidence {
  label: string;
  /** toolCallId, message part id, URL or resource URI that resolves to the raw output. */
  ref: string;
}

export interface ApprovalDecision {
  id: string;
  /** One imperative sentence: verb, count, object, system. */
  action: string;
  /** Systems touched, by the name the human knows. */
  where: string[];
  reversibility: Reversibility;
  risk: { level: RiskLevel; reason: string };
  why?: { summary: string; evidence: Evidence[] };
  confidence?: Confidence;
  cost?: { currency: string; runSoFar?: number; estimated?: number };
  arguments: {
    values: Record<string, unknown>;
    /** JSON pointers into values the human may edit. */
    editable?: string[];
    schema?: Record<string, unknown>;
    /** Tool name, model name, request ids. Collapsed section only. */
    internal?: Record<string, string>;
  };
  availableResponses: ResponseKind[];
  alwaysAllow?: { actionClass: string; revokePath: string };
  pending?: { position?: number; total?: number; ceiling?: number };
}

export interface ApprovalResponse {
  id: string;
  response: ResponseKind;
  reason?: string;
  editedArguments?: Record<string, unknown>;
  alwaysAllow?: boolean;
  decidedAt?: string;
}
