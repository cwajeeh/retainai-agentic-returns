import Link from "next/link";
import { DEMO_LINE_ITEM_ID } from "@/lib/api";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">RetainAI</p>
        <h1 className="text-4xl font-bold tracking-tight">Turn returns into revenue.</h1>
        <p className="text-lg text-slate-600">
          An agentic AI negotiator that talks to your customers before they refund — suggesting exchanges and
          upsells from your real-time Shopify inventory instead of just processing a refund.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          Open merchant dashboard
        </Link>
        <Link
          href={`/return/${DEMO_LINE_ITEM_ID}`}
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
        >
          Try the customer return flow
        </Link>
      </div>
      <p className="max-w-md text-xs text-slate-400">
        Demo mode: seeded with a fake Shopify store so both flows work without a live Shopify/OpenAI account.
      </p>
    </main>
  );
}
