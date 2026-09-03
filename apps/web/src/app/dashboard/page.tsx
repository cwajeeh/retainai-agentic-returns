"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, DEMO_MERCHANT_ID } from "@/lib/api";
import type { ReturnRequest, RevenueSummary } from "@retainai/shared";
import { StatCard } from "@/components/StatCard";
import { RevenueSplitBar } from "@/components/RevenueSplitBar";

const STATUS_LABEL: Record<ReturnRequest["status"], string> = {
  requested: "Requested",
  negotiating: "Negotiating",
  exchange_accepted: "Exchange accepted",
  upsell_accepted: "Upsell accepted",
  refund_approved: "Refund approved",
  label_generated: "Label generated",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getRevenueSummary(DEMO_MERCHANT_ID), api.listReturns(DEMO_MERCHANT_ID)])
      .then(([s, r]) => {
        setSummary(s);
        setReturns(r);
      })
      .catch((err) => setError(String(err.message ?? err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">RetainAI</p>
          <h1 className="text-2xl font-bold">Merchant dashboard</h1>
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back
        </Link>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t reach the API ({error}). Is <code>npm run dev:api</code> running on port 3001?
        </div>
      )}

      {loading && <p className="text-slate-500">Loading…</p>}

      {summary && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Returns started" value={String(summary.totalReturnsStarted)} sub="last 30 days" />
            <StatCard label="Recovery rate" value={`${(summary.recoveryRate * 100).toFixed(0)}%`} sub="exchanges + upsells / total" />
            <StatCard label="Exchanges" value={String(summary.exchanges)} />
            <StatCard label="Upsells" value={String(summary.upsells)} />
          </div>

          <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Revenue saved vs. refunded</h2>
            <RevenueSplitBar recovered={summary.totalRecoveredValue} refunded={summary.totalRefundedValue} />
          </div>
        </>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-700">Recent returns</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-6 py-2 font-medium">Reason</th>
              <th className="px-6 py-2 font-medium">Status</th>
              <th className="px-6 py-2 font-medium">Resolution</th>
              <th className="px-6 py-2 font-medium">Original</th>
              <th className="px-6 py-2 font-medium">Recovered</th>
              <th className="px-6 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                  No returns yet. Start one from the customer return flow.
                </td>
              </tr>
            )}
            {returns.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-6 py-3 capitalize">{r.reason.replace(/_/g, " ")}</td>
                <td className="px-6 py-3">{STATUS_LABEL[r.status]}</td>
                <td className="px-6 py-3 capitalize">{r.resolution.replace(/_/g, " ")}</td>
                <td className="px-6 py-3">${r.originalValue.toFixed(2)}</td>
                <td className="px-6 py-3 text-emerald-600">{r.recoveredValue > 0 ? `$${r.recoveredValue.toFixed(2)}` : "—"}</td>
                <td className="px-6 py-3">
                  {r.negotiationId && (
                    <Link href={`/return/chat/${r.id}`} className="text-brand-600 hover:underline">
                      View chat
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
