"use client";

// The typical approval card, styled well. Every flaw the skill flags is still here on purpose:
// tool name as headline, raw JSON as the decision surface, a risk badge with no reason, a
// blocking modal, Approve autofocused, a required rejection reason, a dead "Always allow"
// checkbox, and auto-approve after 30 seconds.

import { useEffect, useState } from "react";

type ToolCall = {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  risk?: "low" | "medium" | "high";
};

type Props = {
  call: ToolCall;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  timeoutMs?: number;
};

const riskBadge = {
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "border-destructive/30 bg-destructive/10 text-destructive",
};

const button =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium text-white transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

export function ToolApprovalCard({ call, onApprove, onReject, timeoutMs = 30000 }: Props) {
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => onApprove(call.id), timeoutMs);
    return () => clearTimeout(t);
  }, [call.id, timeoutMs, onApprove]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" className="flex w-[480px] max-w-full flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg leading-none font-semibold">Tool call requires approval</h2>
          <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${riskBadge[call.risk ?? "medium"]}`}>
            {(call.risk ?? "medium").toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          The assistant (gpt-4.1) wants to call <code className="rounded-[3px] bg-muted px-1 font-mono text-foreground">{call.toolName}</code>
        </p>
        <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/60 p-4 font-mono text-xs leading-relaxed">{JSON.stringify(call.args, null, 2)}</pre>
        <p className="text-sm">Are you sure you want to continue?</p>
        {showReject && (
          <textarea
            required
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            placeholder="Reason for rejection (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-2">
          <button className={`${button} bg-destructive hover:bg-destructive/90`} onClick={() => (showReject && reason ? onReject(call.id, reason) : setShowReject(true))}>
            Reject
          </button>
          <button autoFocus className={`${button} bg-emerald-600 hover:bg-emerald-600/90`} onClick={() => onApprove(call.id)}>
            Approve
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" className="size-3.5" /> Always allow this tool
        </label>
      </div>
    </div>
  );
}
