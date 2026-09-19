"use client";

// CopilotKit v2 (`@copilotkit/react-core/v2`) human-in-the-loop, rendered through the rules.
// Typechecked against @copilotkit/react-core@1.73 on 2026-09-19.

import { useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { DecisionCard } from "../shared/DecisionCard";
import type { ApprovalDecision, ApprovalResponse } from "../shared/types";

// The tool's parameters ARE the decision payload. The agent cannot ask for approval
// without stating the action, the systems, reversibility and a risk reason (§2, §4).
const decisionSchema = z.object({
  action: z.string().max(140).describe("One imperative sentence: verb, count, object, system."),
  where: z.array(z.string()).min(1).describe("Systems touched, by the name the human uses."),
  reversibility: z.enum(["undoable", "undoable-with-effort", "permanent"]),
  risk: z.object({
    level: z.enum(["routine", "notable", "consequential"]),
    reason: z.string().max(140).describe("Why this level, stated as a consequence."),
  }),
  why: z
    .object({
      summary: z.string().max(280),
      evidence: z.array(z.object({ label: z.string(), ref: z.string() })),
    })
    .optional(),
  confidence: z.enum(["routine", "unusual-for-context", "agent-uncertain"]).optional(),
  cost: z.object({ currency: z.string(), runSoFar: z.number().optional(), estimated: z.number().optional() }).optional(),
  arguments: z.object({
    values: z.record(z.string(), z.unknown()),
    editable: z.array(z.string()).optional(),
    internal: z.record(z.string(), z.string()).optional(),
  }),
  canDefer: z.boolean().default(true).describe("False only if the run cannot continue without an answer."),
});

type DecisionArgs = z.infer<typeof decisionSchema>;

export function ApprovalGate() {
  useHumanInTheLoop<DecisionArgs>(
    {
      name: "request_approval",
      description:
        "Ask the human to approve an action that has effects outside your sandbox, is not trivially reversible and is not pre-authorised. Never call this for reads. Fill every field from the actual arguments of the action you intend to take.",
      parameters: decisionSchema,
      render: (props) => {
        // Arguments still streaming: never render buttons against a half-formed decision.
        if (!props.respond) {
          if (props.status === "complete") {
            const r = props.result ? (JSON.parse(props.result) as ApprovalResponse) : undefined;
            return <p className="text-sm text-zinc-500">{r ? `You chose: ${r.response}.` : null}</p>;
          }
          return <p className="text-sm text-zinc-500">Preparing a decision…</p>;
        }

        const { canDefer, ...rest } = props.args;
        const decision: ApprovalDecision = {
          id: props.toolCallId,
          ...rest,
          availableResponses: canDefer ? ["approve", "reject", "edit-and-approve", "defer"] : ["approve", "reject", "edit-and-approve"],
        };

        const respond = props.respond;
        return (
          <DecisionCard
            decision={decision}
            onRespond={(r) => {
              if (r.response === "defer") return; // §3, §6: leave the interrupt open
              void respond(r); // the full ApprovalResponse, edited arguments included
            }}
          />
        );
      },
    },
    [],
  );
  return null;
}
