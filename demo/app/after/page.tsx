"use client";

// The same run with the rules applied. Reads and pre-authorised posts run and leave receipts.
// The two real decisions render as one list in the stream. Nothing blocks the page.

import { useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { DecisionCard } from "@skill/shared/DecisionCard";
import type { ApprovalResponse } from "@skill/shared/types";
import { STEPS } from "@/lib/scenario";

const smallButton =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50";

export default function After() {
  const [responses, setResponses] = useState<Record<string, ApprovalResponse>>({});
  const [evidence, setEvidence] = useState<string | null>(null);

  const gates = STEPS.filter((s) => s.decision && !responses[s.toolCallId]);
  const done = STEPS.filter((s) => !s.decision || responses[s.toolCallId]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">After</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Two receipts, two decisions, one list</h1>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            The action is the headline. Reversibility and the reason for the risk level are always visible. Approve is not focused. Nothing happens on a timer.
          </p>
        </div>
        {gates.length > 0 ? (
          <button
            type="button"
            className={`${smallButton} shrink-0`}
            onClick={() =>
              setResponses((m) => {
                const next = { ...m };
                for (const g of gates) next[g.toolCallId] = { id: g.toolCallId, response: "defer" };
                return next;
              })
            }
          >
            <X className="size-3.5" /> Close demo
          </button>
        ) : null}
      </div>

      <ol className="flex flex-col gap-4">
        {done.map((s) => {
          const r = responses[s.toolCallId];
          const parked = r?.response === "defer";
          return (
            <li key={s.toolCallId} className="flex items-center gap-3 px-1 text-sm text-muted-foreground">
              {parked ? <Clock className="size-4 shrink-0" /> : <Check className="size-4 shrink-0 text-brand" />}
              <span>{r ? outcome(r, s.receipt) : s.receipt}</span>
            </li>
          );
        })}
        {gates.map((s, i) => (
          <li key={s.toolCallId}>
            <DecisionCard
              decision={{ ...s.decision!, pending: { position: i + 1, total: gates.length } }}
              onRespond={(r) => setResponses((m) => ({ ...m, [s.toolCallId]: r }))}
              openEvidence={(ref) => setEvidence(ref)}
            />
          </li>
        ))}
      </ol>

      {gates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Run finished.{" "}
          <button className="underline underline-offset-2 transition-colors hover:text-brand" onClick={() => setResponses({})}>
            Replay
          </button>
        </p>
      ) : null}

      {evidence ? (
        <aside className="flex flex-col gap-3 rounded-xl border p-5 text-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Raw output · {evidence}</p>
            <button className={smallButton} onClick={() => setEvidence(null)}>
              <X className="size-3.5" /> Close
            </button>
          </div>
          <pre className="overflow-auto rounded-lg border bg-muted/60 p-4 font-mono text-xs leading-relaxed">{fakeEvidence(evidence)}</pre>
        </aside>
      ) : null}
    </div>
  );
}

function outcome(r: ApprovalResponse, receipt: string): string {
  switch (r.response) {
    case "approve":
      return receipt;
    case "edit-and-approve":
      return `${receipt} (with your edits)`;
    case "reject":
      return `Skipped.${r.reason ? ` ${r.reason}` : ""}`;
    case "defer":
      return "Parked. The agent is continuing with other work.";
  }
}

function fakeEvidence(ref: string): string {
  if (ref.startsWith("call_04")) return JSON.stringify({ object: "search_result", total_count: 14, data: [{ id: "in_1H1B58Q2eZvKYlo2C", status: "void", created: 1546300800 }, "…13 more"] }, null, 2);
  if (ref.includes("list")) return JSON.stringify({ id: "finance-all", name: "Finance (all)", contact_count: 340 }, null, 2);
  if (ref.includes("template")) return "Subject: Q3 invoice reminder\n\nHi {{first_name}}, a quick reminder that…";
  return "# Billing cleanup\n\n2. Remind finance contacts before deleting invoices older than 6 years.";
}
