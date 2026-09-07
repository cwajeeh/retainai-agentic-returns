import Link from "next/link";
import { DEMO_LINE_ITEM_ID } from "@/lib/api";
import { ArrowRight, LayoutDashboard, MessageSquareText, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 py-16 text-center">
      <span className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-card">
        <Sparkles size={20} strokeWidth={2.25} />
      </span>

      <div className="max-w-2xl space-y-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-600">RetainAI</p>
        <h1 className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-ink-900">
          Turn returns into revenue.
        </h1>
        <p className="text-[16px] leading-relaxed text-ink-500">
          An agentic AI negotiator that talks to your customers before they refund — suggesting exchanges and
          upsells from your real-time Shopify inventory instead of just processing a refund.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-5 py-3 text-[14px] font-medium text-white shadow-card transition hover:bg-brand-700"
        >
          <LayoutDashboard size={16} />
          Open merchant dashboard
        </Link>
        <Link
          href={`/return/${DEMO_LINE_ITEM_ID}`}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white px-5 py-3 text-[14px] font-medium text-ink-700 shadow-card transition hover:border-ink-300"
        >
          <MessageSquareText size={16} />
          Try the customer return flow
          <ArrowRight size={14} className="text-ink-400" />
        </Link>
      </div>

      <p className="mt-8 max-w-md text-[12.5px] text-ink-400">
        Demo mode: seeded with a fake Shopify store so both flows work without a live Shopify/OpenAI account.
      </p>
    </main>
  );
}
