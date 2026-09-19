// app/api/chat/route.ts
// Typechecked against ai@7 / @ai-sdk/react@3 (see README). On ai@6, the same logic
// lives in `needsApproval` on each tool() instead of `toolApproval`.

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ApprovalDecision } from "../shared/types";

/** Edit-and-approve: the client sends these in `options.body` when it approves with edits. */
type Edit = { toolName: string; original: unknown; edited: Record<string, unknown> };

const tools = {
  github_read_file: tool({
    description: "Read a file from a GitHub repo",
    inputSchema: z.object({ repo: z.string(), path: z.string() }),
    execute: async ({ repo, path }) => readGithubFile(repo, path),
  }),
  slack_post_message: tool({
    description: "Post a message to a Slack channel",
    inputSchema: z.object({ channel: z.string(), text: z.string() }),
    execute: async (input) => postToSlack(input),
  }),
  sendgrid_send_campaign: tool({
    description: "Send an email campaign",
    inputSchema: z.object({ listId: z.string(), templateId: z.string(), recipientCount: z.number() }),
    execute: async (input) => sendCampaign(input),
  }),
  stripe_delete_invoices: tool({
    description: "Delete invoices in Stripe",
    inputSchema: z.object({ olderThan: z.string(), ids: z.array(z.string()) }),
    execute: async (input) => deleteInvoices(input),
  }),
};

export async function POST(req: Request) {
  const { messages, edits = [] }: { messages: UIMessage[]; edits?: Edit[] } = await req.json();

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic("claude-sonnet-5"),
        messages: await convertToModelMessages(messages),
        tools,

        // §1: gate per instance, from the arguments. Reads never gate.
        // The decision payload travels to the client as a data part keyed by toolCallId,
        // because the approval request itself only carries an id and a reason.
        toolApproval: ({ toolCall }) => {
          const decision = describe(toolCall.toolName, toolCall.input as Record<string, unknown>, toolCall.toolCallId);
          if (!decision) return "not-applicable";
          writer.write({ type: "data-approval", id: toolCall.toolCallId, data: decision });
          return { type: "user-approval", reason: decision.risk.reason };
        },

        // §3 edit-and-approve: swap in the human's edited input before execution.
        // Refinement is keyed by tool name and sees only the input, so match on the original.
        experimental_refineToolInput: Object.fromEntries(
          Object.keys(tools).map((name) => [
            name,
            (input: unknown) => {
              const hit = edits.find((e) => e.toolName === name && JSON.stringify(e.original) === JSON.stringify(input));
              return hit ? hit.edited : input;
            },
          ]),
        ),
      });

      writer.merge(result.toUIMessageStream({ originalMessages: messages }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}


/**
 * The agent's understanding of the action, written as the decision payload.
 * Returns null when no gate is needed. This is the only place that decides
 * both "should this gate" and "what does the human see".
 */
function describe(toolName: string, input: Record<string, unknown>, toolCallId: string): ApprovalDecision | null {
  const internal = { tool: toolName, toolCallId };

  switch (toolName) {
    case "github_read_file":
      return null; // §1 never gate reads

    case "slack_post_message": {
      const channel = String(input.channel);
      if (channel.endsWith("-test")) return null; // pre-authorised class
      const wide = /^#(all|general|announce)/.test(channel);
      return {
        id: toolCallId,
        action: `Post a message to ${channel} in Slack.`,
        where: ["Slack"],
        reversibility: "undoable-with-effort",
        risk: wide
          ? { level: "consequential", reason: `posts to ${channel}, which everyone in the workspace reads` }
          : { level: "notable", reason: `first message to ${channel} this run` },
        why: { summary: "The run plan asked for a status update to the ops channel.", evidence: [{ label: "Run plan", ref: "step:plan" }] },
        arguments: { values: input, editable: ["/text"], internal },
        availableResponses: ["approve", "reject", "edit-and-approve", "defer"],
        alwaysAllow: { actionClass: `Post to ${channel} in Slack`, revokePath: "Settings → Agent permissions" },
      };
    }

    case "sendgrid_send_campaign": {
      const n = Number(input.recipientCount);
      return {
        id: toolCallId,
        action: `Send the "${input.templateId}" email to ${n} people on the "${input.listId}" list.`,
        where: ["SendGrid"],
        reversibility: "permanent",
        risk: { level: "consequential", reason: `sends email to ${n} external recipients` },
        why: {
          summary: `The list "${input.listId}" matched the request for finance contacts. Template last edited 3 days ago.`,
          evidence: [
            { label: `SendGrid list lookup, ${n} contacts`, ref: `tool:${toolCallId}:list` },
            { label: "Template preview", ref: `tool:${toolCallId}:template` },
          ],
        },
        confidence: n > 100 ? "unusual-for-context" : undefined,
        cost: { currency: "USD", estimated: Math.round(n * 0.0012 * 100) / 100 },
        arguments: { values: input, editable: ["/templateId"], internal },
        availableResponses: ["approve", "reject", "edit-and-approve", "defer"],
      };
    }

    case "stripe_delete_invoices": {
      const ids = input.ids as string[];
      return {
        id: toolCallId,
        action: `Delete ${ids.length} invoices older than ${String(input.olderThan).slice(0, 4)} from Stripe.`,
        where: ["Stripe"],
        reversibility: "undoable-with-effort",
        risk: { level: "consequential", reason: "removes billing records; restoring means a Stripe support ticket" },
        why: {
          summary: `Invoice search returned ${ids.length} invoices dated before ${input.olderThan}, all in status "void" or "uncollectible".`,
          evidence: [{ label: `Stripe invoice search, ${ids.length} results`, ref: `tool:${toolCallId}:search` }],
        },
        arguments: { values: input, editable: ["/ids"], internal },
        availableResponses: ["approve", "reject", "edit-and-approve", "defer"],
      };
    }

    default:
      // Unknown tool: gate it and say so honestly.
      return {
        id: toolCallId,
        action: `Run an action the agent could not describe (${toolName}).`,
        where: ["Unknown"],
        reversibility: "undoable-with-effort",
        risk: { level: "notable", reason: "the agent has no description for this tool" },
        arguments: { values: input, internal },
        availableResponses: ["approve", "reject", "defer"],
      };
  }
}

declare function readGithubFile(repo: string, path: string): Promise<string>;
declare function postToSlack(i: { channel: string; text: string }): Promise<unknown>;
declare function sendCampaign(i: { listId: string; templateId: string; recipientCount: number }): Promise<unknown>;
declare function deleteInvoices(i: { olderThan: string; ids: string[] }): Promise<unknown>;
