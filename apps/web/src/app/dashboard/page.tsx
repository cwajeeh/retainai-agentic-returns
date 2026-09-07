"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, DEMO_MERCHANT_ID } from "@/lib/api";
import type { ReturnRequest, RevenueSummary } from "@retainai/shared";
import { StatCard, StatCardSkeleton } from "@/components/StatCard";
import { RevenueChart, RevenueChartSkeleton } from "@/components/RevenueChart";
import { StatusBadge, ResolutionTag } from "@/components/StatusBadge";
import { AppShell } from "@/components/AppShell";
import { AlertTriangle, ArrowUpRight, Inbox, PackageOpen, Percent, RefreshCw, Repeat, TrendingUp } from "lucide-react";

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
    <AppShell title="Overview" subtitle="Last 30 days · demo-store.myshopify.com">
      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-critical/20 bg-critical-bg px-4 py-3 text-[13px] text-critical">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Couldn&apos;t reach the API ({error}). Is <code className="rounded bg-white/60 px-1 py-0.5">npm run dev:api</code> running on
            port 3001?
          </span>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !summary ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={Inbox} label="Returns started" value={String(summary.totalReturnsStarted)} sub="last 30 days" />
            <StatCard
              icon={Percent}
              label="Recovery rate"
              value={`${(summary.recoveryRate * 100).toFixed(0)}%`}
              sub="exchanges + upsells / total"
            />
            <StatCard icon={Repeat} label="Exchanges" value={String(summary.exchanges)} sub="items swapped, not refunded" />
            <StatCard icon={ArrowUpRight} label="Upsells" value={String(summary.upsells)} sub="higher-value swaps" />
          </>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <TrendingUp size={15} strokeWidth={2.25} />
          </span>
          <h2 className="text-[14px] font-semibold text-ink-900">Revenue saved vs. refunded</h2>
        </div>
        {loading || !summary ? (
          <RevenueChartSkeleton />
        ) : (
          <RevenueChart recovered={summary.totalRecoveredValue} refunded={summary.totalRefundedValue} />
        )}
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
          <h2 className="text-[14px] font-semibold text-ink-900">Recent returns</h2>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/returns" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
              View all →
            </Link>
            <RefreshCw size={14} className="text-ink-300" />
          </div>
        </div>

        {returns.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2.5 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <PackageOpen size={20} />
            </span>
            <p className="text-[13.5px] font-medium text-ink-700">No returns yet</p>
            <p className="text-[13px] text-ink-400">Start one from the customer return flow to see it here.</p>
          </div>
        ) : (
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="text-[12px] uppercase tracking-wide text-ink-400">
                <th className="px-6 py-2.5 font-medium">Reason</th>
                <th className="px-6 py-2.5 font-medium">Status</th>
                <th className="px-6 py-2.5 font-medium">Resolution</th>
                <th className="px-6 py-2.5 font-medium">Original</th>
                <th className="px-6 py-2.5 font-medium">Recovered</th>
                <th className="px-6 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-ink-100">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-3.5">
                        <div className="skeleton h-4 w-16" />
                      </td>
                    ))}
                  </tr>
                ))}
              {returns.map((r) => (
                <tr key={r.id} className="border-t border-ink-100 transition hover:bg-ink-50/60">
                  <td className="px-6 py-3.5 capitalize text-ink-700">{r.reason.replace(/_/g, " ")}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-6 py-3.5">
                    <ResolutionTag resolution={r.resolution} />
                  </td>
                  <td className="tabular px-6 py-3.5 text-ink-700">${r.originalValue.toFixed(2)}</td>
                  <td className="tabular px-6 py-3.5 font-medium text-good">
                    {r.recoveredValue > 0 ? `$${r.recoveredValue.toFixed(2)}` : <span className="font-normal text-ink-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {r.negotiationId && (
                      <Link href={`/return/chat/${r.id}`} className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
                        View chat →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
