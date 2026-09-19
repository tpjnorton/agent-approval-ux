"use client";

// The typical card, as found in the wild: every tool call gets a modal, one at a time,
// including the read. Auto-approves after 30 seconds. This file is the "before".

import { useState } from "react";
import { STEPS } from "@/lib/scenario";
import { ToolApprovalCard } from "./ToolApprovalCard";

export default function Before() {
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const step = STEPS[index];

  function next(line: string) {
    setLog((l) => [...l, line]);
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Before</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">The card you already have</h1>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            Tool name, raw JSON, a badge nobody defined, two buttons. Four modals in a row, one of them for a read. Wait 30 seconds and it approves itself.
          </p>
        </div>
        {step ? (
          <button
            type="button"
            className="relative z-[60] inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent dark:bg-input/30 dark:border-input"
            onClick={() => { setLog((l) => [...l, "Demo closed."]); setIndex(STEPS.length); }}
          >
            Close demo
          </button>
        ) : null}
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {log.map((l, i) => (
          <li key={i} className="text-muted-foreground">{l}</li>
        ))}
      </ul>
      {step ? (
        <ToolApprovalCard
          call={{ id: step.toolCallId, toolName: step.toolName, args: step.input, risk: step.legacyRisk }}
          onApprove={() => next(`Approved ${step.toolName}`)}
          onReject={(_, reason) => next(`Rejected ${step.toolName}: ${reason}`)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Run finished. <button className="underline underline-offset-2 transition-colors hover:text-brand" onClick={() => { setIndex(0); setLog([]); }}>Replay</button></p>
      )}
    </div>
  );
}
