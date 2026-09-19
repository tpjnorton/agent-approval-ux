"use client";

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

const riskColor = { low: "bg-green-100 text-green-800", medium: "bg-amber-100 text-amber-800", high: "bg-red-100 text-red-800" };

export function ToolApprovalCard({ call, onApprove, onReject, timeoutMs = 30000 }: Props) {
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => onApprove(call.id), timeoutMs);
    return () => clearTimeout(t);
  }, [call.id, timeoutMs, onApprove]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[480px] rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tool call requires approval</h2>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${riskColor[call.risk ?? "medium"]}`}>
            {(call.risk ?? "medium").toUpperCase()}
          </span>
        </div>
        <p className="mb-2 text-sm text-gray-600">
          The assistant (gpt-4.1) wants to call <code className="rounded bg-gray-100 px-1">{call.toolName}</code>
        </p>
        <pre className="mb-4 max-h-64 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
          {JSON.stringify(call.args, null, 2)}
        </pre>
        <p className="mb-4 text-sm">Are you sure you want to continue?</p>
        {showReject && (
          <textarea
            required
            className="mb-3 w-full rounded border p-2 text-sm"
            placeholder="Reason for rejection (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-2">
          <button
            className="rounded bg-red-600 px-4 py-2 text-sm text-white"
            onClick={() => (showReject && reason ? onReject(call.id, reason) : setShowReject(true))}
          >
            Reject
          </button>
          <button
            autoFocus
            className="rounded bg-green-600 px-4 py-2 text-sm text-white"
            onClick={() => onApprove(call.id)}
          >
            Approve
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <input type="checkbox" /> Always allow this tool
        </label>
      </div>
    </div>
  );
}
