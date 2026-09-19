import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">agent-approval-ux</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">One agent run, two approval surfaces</h1>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
          A sandbox ops agent reads a file, posts to a test channel, then wants to email 340 people and delete 14 Stripe invoices. Both pages show exactly the same run. Only the decision surface changes.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { href: "/before", title: "Before", body: "A typical card. Tool name, raw JSON, amber badge, two buttons, a modal per call, auto-approve after 30 seconds." },
          { href: "/after", title: "After", body: "The skill applied. Reads run, the test post runs, two decisions render as a list with the action, reversibility and reason up front." },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="group flex flex-col gap-2 rounded-xl border p-5 transition-colors hover:border-brand hover:bg-brand/[0.02] dark:hover:bg-brand/[0.04]">
            <h2 className="flex items-center gap-2 font-semibold transition-colors group-hover:text-brand">
              {c.title}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
