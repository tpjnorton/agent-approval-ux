import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const mono = Roboto_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Approval UX demo",
  description: "The same agent run, rendered before and after the agent-approval-ux rules.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Follow the OS theme by toggling the .dark class, the way tpjnorton.com does via next-themes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=matchMedia('(prefers-color-scheme: dark)');var a=function(){document.documentElement.classList.toggle('dark',m.matches)};a();m.addEventListener('change',a)}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <header className="border-b">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight">
              Approval UX <span className="text-brand">demo</span>
            </Link>
            <nav className="flex gap-4 text-muted-foreground">
              <Link href="/before" className="transition-colors hover:text-foreground">Before</Link>
              <Link href="/after" className="transition-colors hover:text-foreground">After</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
