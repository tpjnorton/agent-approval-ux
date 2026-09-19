"use client";

/**
 * Framework-agnostic decision surface. Takes an ApprovalDecision, returns an
 * ApprovalResponse. Every framework example adapts to and from this.
 *
 * Styling: shadcn theme tokens (bg-card, text-muted-foreground, border, ring...)
 * and lucide-react icons, so it drops into any shadcn app unchanged.
 * Rules applied are marked with SKILL.md section numbers.
 */

import { Fragment, useId, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Lock,
  Pencil,
  RotateCcw,
  Undo2,
} from "lucide-react";
import type { ApprovalDecision, ApprovalResponse, Reversibility, RiskLevel } from "./types";

const REVERSIBILITY: Record<Reversibility, { label: string; Icon: typeof RotateCcw }> = {
  undoable: { label: "Undoable", Icon: RotateCcw },
  "undoable-with-effort": { label: "Undoable with effort", Icon: Undo2 },
  permanent: { label: "Permanent", Icon: Lock },
};

const RISK_LABEL: Record<RiskLevel, string> = {
  routine: "Routine",
  notable: "Notable",
  consequential: "Consequential",
};

// §4: routine is neutral, notable gets one accent, consequential gets strong treatment.
const RISK_FRAME: Record<RiskLevel, string> = {
  routine: "",
  notable: "border-amber-500/50",
  consequential: "border-destructive/50",
};

const RISK_BADGE: Record<RiskLevel, string> = {
  routine: "border-border text-muted-foreground",
  notable: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  consequential: "border-destructive/30 bg-destructive/10 text-destructive",
};

const button =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";
const buttonPrimary = `${button} bg-brand text-white hover:bg-brand/90`;
const buttonOutline = `${button} border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50`;
const buttonGhost = `${button} text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50`;
const disclosure =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md text-sm font-medium text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4";
const badge = "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3";
const input =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

type Props = {
  decision: ApprovalDecision;
  onRespond: (response: ApprovalResponse) => void;
  /** Resolves an evidence ref to something the card can open or show. */
  openEvidence?: (ref: string) => void;
  pendingResponse?: boolean;
};

export function DecisionCard({ decision, onRespond, openEvidence, pendingResponse }: Props) {
  const d = decision;
  const consequential = d.risk.level === "consequential";
  const [whyOpen, setWhyOpen] = useState(consequential); // §2.4 expanded by default when consequential
  const [argsOpen, setArgsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(d.arguments.values, null, 2));
  const [draftError, setDraftError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [armed, setArmed] = useState(!consequential); // §4 consequential approve needs a deliberate step
  const [alwaysAllow, setAlwaysAllow] = useState(false);
  const uid = useId();

  const can = (k: ApprovalResponse["response"]) => d.availableResponses.includes(k);
  const editable = (d.arguments.editable?.length ?? 0) > 0 && can("edit-and-approve");
  const rev = REVERSIBILITY[d.reversibility];

  function respond(kind: ApprovalResponse["response"], extra: Partial<ApprovalResponse> = {}) {
    onRespond({ id: d.id, response: kind, decidedAt: new Date().toISOString(), ...extra });
  }

  function approve() {
    if (editing) {
      try {
        const values = JSON.parse(draft) as Record<string, unknown>;
        respond("edit-and-approve", { editedArguments: values, alwaysAllow: alwaysAllow || undefined });
      } catch (e) {
        setDraftError(e instanceof Error ? e.message : "Invalid JSON");
      }
      return;
    }
    respond("approve", { alwaysAllow: alwaysAllow || undefined });
  }

  return (
    // §6: a section in the stream, never a fixed overlay. Escape does nothing.
    <section
      aria-labelledby={`${uid}-action`}
      className={`flex flex-col gap-5 rounded-xl border bg-card p-6 text-card-foreground transition-colors ${RISK_FRAME[d.risk.level]}`}
      onKeyDown={(e) => {
        // §7 one key expands evidence, but never while typing in a field.
        const tag = (e.target as HTMLElement).tagName;
        if (e.key === "e" && !editing && tag !== "TEXTAREA" && tag !== "INPUT") setWhyOpen((v) => !v);
      }}
    >
      {/* Header: queue position, §2.1 the action as headline, §4 risk with reason */}
      <header className="flex flex-col gap-2">
        {d.pending?.total && d.pending.total > 1 ? (
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Decision {d.pending.position} of {d.pending.total}
          </p>
        ) : null}
        <h2 id={`${uid}-action`} className="text-lg leading-snug font-semibold tracking-tight">
          {d.action}
        </h2>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`${badge} ${RISK_BADGE[d.risk.level]}`}>
            {consequential ? <AlertTriangle /> : null}
            {RISK_LABEL[d.risk.level]}
          </span>
          <span className="text-muted-foreground">{d.risk.reason}</span>
        </p>
      </header>

      {/* §2.2 where, §2.3 reversibility, §2.5 confidence, §2.6 cost */}
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Where</dt>
        <dd className="flex flex-wrap gap-1.5">
          {d.where.map((w) => (
            <span key={w} className={`${badge} border-border`}>
              {w}
            </span>
          ))}
        </dd>
        <dt className="text-muted-foreground">Reversibility</dt>
        <dd>
          <span className={`${badge} ${d.reversibility === "permanent" ? "border-destructive/30 text-destructive" : "border-border"}`}>
            <rev.Icon />
            {rev.label}
          </span>
        </dd>
        {d.confidence && d.confidence !== "routine" ? (
          <>
            <dt className="text-muted-foreground">Confidence</dt>
            <dd>{d.confidence === "agent-uncertain" ? "Agent is uncertain" : "Unusual for this context"}</dd>
          </>
        ) : null}
        {d.cost?.estimated != null ? (
          <>
            <dt className="text-muted-foreground">Cost</dt>
            <dd>
              <span className="font-medium">{formatMoney(d.cost.estimated, d.cost.currency)}</span> for this action
              {d.cost.runSoFar != null ? (
                <span className="text-muted-foreground">, {formatMoney(d.cost.runSoFar, d.cost.currency)} so far this run</span>
              ) : null}
            </dd>
          </>
        ) : null}
      </dl>

      {/* §2.4 why, collapsed unless consequential, links to raw output; §2.7 details, collapsed */}
      <div className="flex flex-col gap-3 border-t pt-4">
        {d.why ? (
          <div>
            <button type="button" aria-expanded={whyOpen} aria-controls={`${uid}-why`} onClick={() => setWhyOpen((v) => !v)} className={disclosure}>
              {whyOpen ? <ChevronDown /> : <ChevronRight />}
              Why the agent chose this
            </button>
            {whyOpen ? (
              <div id={`${uid}-why`} className="mt-2 flex flex-col gap-3 rounded-lg bg-muted/60 p-4 text-sm">
                <p className="leading-relaxed">{d.why.summary}</p>
                <ul className="flex flex-wrap gap-2">
                  {d.why.evidence.map((ev) => (
                    <li key={ev.ref}>
                      {openEvidence ? (
                        <button type="button" onClick={() => openEvidence(ev.ref)} className={`${badge} cursor-pointer border-border bg-background hover:bg-accent`}>
                          {ev.label}
                          <ExternalLink />
                        </button>
                      ) : (
                        <span className={`${badge} border-border bg-background`}>{ev.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <button type="button" aria-expanded={argsOpen} aria-controls={`${uid}-args`} onClick={() => setArgsOpen((v) => !v)} className={disclosure}>
            {argsOpen ? <ChevronDown /> : <ChevronRight />}
            Details
            {editable ? <span className="ml-1 text-xs font-normal text-muted-foreground">editable</span> : null}
          </button>
          {argsOpen ? (
            <div id={`${uid}-args`} className="mt-2 flex flex-col gap-2 text-sm">
              {editing ? (
                <>
                  <textarea
                    aria-label="Edit arguments"
                    className={`${input} h-44 resize-y py-2 font-mono text-xs`}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setDraftError(null);
                    }}
                  />
                  {draftError ? <p className="text-xs text-destructive">{draftError}</p> : null}
                </>
              ) : (
                <pre className="overflow-auto rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed">{JSON.stringify(d.arguments.values, null, 2)}</pre>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {d.arguments.internal ? (
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
                    {Object.entries(d.arguments.internal).map(([k, v]) => (
                      <Fragment key={k}>
                        <div>
                          <dt className="inline">{k}: </dt>
                          <dd className="inline">{v}</dd>
                        </div>
                      </Fragment>
                    ))}
                  </dl>
                ) : (
                  <span />
                )}
                {editable && !editing ? (
                  <button type="button" onClick={() => setEditing(true)} className={`${buttonGhost} h-7 px-2 text-xs`}>
                    <Pencil /> Edit
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* §3 reject reason optional, §4 deliberate step for consequential, §3 scoped always-allow */}
      <div className="flex flex-col gap-3">
        {can("reject") ? (
          <input aria-label="Reason (optional)" placeholder="Reason (optional)" className={input} value={reason} onChange={(e) => setReason(e.target.value)} />
        ) : null}
        {consequential ? (
          <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug">
            <input type="checkbox" checked={armed} onChange={(e) => setArmed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]" />
            <span>
              I have read what this does and that it is <span className="font-medium">{rev.label.toLowerCase()}</span>.
            </span>
          </label>
        ) : null}
        {d.alwaysAllow && can("approve") ? (
          <div className="text-xs text-muted-foreground">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={alwaysAllow} onChange={(e) => setAlwaysAllow(e.target.checked)} className="size-3.5 accent-[var(--color-brand)]" />
              Always allow: {d.alwaysAllow.actionClass}
            </label>
            <p className="ml-[1.375rem]">Change this in {d.alwaysAllow.revokePath}</p>
          </div>
        ) : null}
      </div>

      {/* §3 four actions. §7 Reject and Approve differ by position, label and weight, not colour.
          §4 Approve is never autoFocus. Reject precedes Approve in DOM order. */}
      <footer className="flex flex-wrap items-center gap-2 border-t pt-4">
        {can("defer") ? (
          <button type="button" disabled={pendingResponse} onClick={() => respond("defer")} className={`${buttonGhost} mr-auto px-3`}>
            <Clock /> Decide later
          </button>
        ) : (
          <span className="mr-auto" />
        )}
        {can("reject") ? (
          <button type="button" disabled={pendingResponse} onClick={() => respond("reject", { reason: reason || undefined })} className={buttonOutline}>
            Reject
          </button>
        ) : null}
        {can("approve") ? (
          <button type="button" disabled={pendingResponse || !armed} onClick={approve} className={buttonPrimary}>
            <Check />
            {editing ? "Approve with edits" : approveLabel(d.action)}
          </button>
        ) : null}
      </footer>
    </section>
  );
}

/** Verb + count + object when it fits, else "Approve". copy-guide.md, Buttons. */
function approveLabel(action: string): string {
  const short = action.replace(/\.$/, "").split(/\s+(from|in|to|on|via)\s+/i)[0];
  return short.length <= 24 ? short : "Approve";
}

function formatMoney(n: number, currency: string): string {
  if (/^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
    } catch {
      /* fall through */
    }
  }
  return `${n} ${currency}`;
}
