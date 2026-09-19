import type { ApprovalDecision } from "@skill/shared/types";

/** One scripted turn from a sandbox ops agent. Same data feeds both pages. */
export type Step = {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  /** null: the rules say no gate, run it and show a receipt. */
  decision: ApprovalDecision | null;
  receipt: string;
  /** What the "before" card shows as its badge. */
  legacyRisk: "low" | "medium" | "high";
};

const INVOICE_IDS = Array.from({ length: 14 }, (_, i) => `in_1H${(7000 + i * 37).toString(16).toUpperCase()}Q2eZvKYlo2C`);

export const STEPS: Step[] = [
  {
    toolCallId: "call_01",
    toolName: "github_read_file",
    input: { repo: "acme/ops-runbooks", path: "billing/cleanup.md" },
    decision: null,
    receipt: "Read billing/cleanup.md from acme/ops-runbooks.",
    legacyRisk: "low",
  },
  {
    toolCallId: "call_02",
    toolName: "slack_post_message",
    input: { channel: "#ops-test", text: "Starting Q3 billing cleanup dry run." },
    decision: null,
    receipt: "Posted to #ops-test in Slack.",
    legacyRisk: "medium",
  },
  {
    toolCallId: "call_03",
    toolName: "sendgrid_send_campaign",
    input: { listId: "finance-all", templateId: "q3-reminder", recipientCount: 340 },
    legacyRisk: "medium",
    receipt: "Sent the Q3 reminder to 340 people on the finance-all list.",
    decision: {
      id: "call_03",
      action: "Send the Q3 reminder email to 340 people on the Finance list.",
      where: ["SendGrid"],
      reversibility: "permanent",
      risk: { level: "consequential", reason: "sends email to 340 external recipients" },
      why: {
        summary: 'The runbook says to remind finance contacts before deleting old invoices. The list "finance-all" matched. The template was last edited 3 days ago.',
        evidence: [
          { label: "Runbook, section 2", ref: "call_01" },
          { label: "SendGrid list lookup, 340 contacts", ref: "call_03:list" },
          { label: "Template preview", ref: "call_03:template" },
        ],
      },
      confidence: "unusual-for-context",
      cost: { currency: "USD", runSoFar: 0.04, estimated: 0.41 },
      arguments: {
        values: { listId: "finance-all", templateId: "q3-reminder", recipientCount: 340 },
        editable: ["/templateId"],
        internal: { tool: "sendgrid_send_campaign", toolCallId: "call_03", model: "claude-sonnet-5" },
      },
      availableResponses: ["approve", "reject", "edit-and-approve", "defer"],
    },
  },
  {
    toolCallId: "call_04",
    toolName: "stripe_delete_invoices",
    input: { olderThan: "2019-01-01", ids: INVOICE_IDS },
    legacyRisk: "high",
    receipt: "Deleted 14 invoices older than 2019 from Stripe.",
    decision: {
      id: "call_04",
      action: "Delete 14 invoices older than 2019 from Stripe.",
      where: ["Stripe"],
      reversibility: "undoable-with-effort",
      risk: { level: "consequential", reason: "removes billing records; restoring means a Stripe support ticket" },
      why: {
        summary: 'Invoice search returned 14 invoices dated before 2019-01-01, all in status "void" or "uncollectible". None has an open dispute.',
        evidence: [{ label: "Stripe invoice search, 14 results", ref: "call_04:search" }],
      },
      arguments: {
        values: { olderThan: "2019-01-01", ids: INVOICE_IDS },
        editable: ["/ids"],
        internal: { tool: "stripe_delete_invoices", toolCallId: "call_04", model: "claude-sonnet-5" },
      },
      availableResponses: ["approve", "reject", "edit-and-approve", "defer"],
    },
  },
];
