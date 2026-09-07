"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, DEMO_MERCHANT_ID } from "@/lib/api";
import type { ReturnRequest } from "@retainai/shared";
import { AppShell } from "@/components/AppShell";
import { StatusBadge, ResolutionTag } from "@/components/StatusBadge";
import { AlertTriangle, PackageOpen, RefreshCw, Search } from "lucide-react";

type FilterKey = "all" | "active" | "resolved" | "cancelled";

const FILTERS: { key: FilterKey; label: string; test: (r: ReturnRequest) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "active", label: "Active", test: (r) => r.status === "requested" || r.status === "negotiating" },
  {
    key: "resolved",
    label: "Resolved",
    test: (r) =>
      ["exchange_accepted", "upsell_accepted", "refund_approved", "label_generated", "completed"].includes(r.status),
  },
  { key: "cancelled", label: "Cancelled", test: (r) => r.status === "cancelled" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  function load() {
    setLoading(true);
    api
      .listReturns(DEMO_MERCHANT_ID)
      .then(setReturns)
      .catch((err) => setError(String(err.message ?? err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return returns
      .filter(activeFilter.test)
      .filter((r) => !q || r.reason.replace(/_/g, " ").includes(q) || r.id.toLowerCase().includes(q) || (r.customerComment ?? "").toLowerCase().includes(q));
  }, [returns, activeFilter, query]);

  const counts = useMemo(() => {
    const map: Record<FilterKey, number> = { all: 0, active: 0, resolved: 0, cancelled: 0 };
    for (const f of FILTERS) map[f.key] = returns.filter(f.test).length;
    return map;
  }, [returns]);

  return (
    <AppShell title="Returns" subtitle="All return requests · demo-store.myshopify.com">
      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-critical/20 bg-critical-bg px-4 py-3 text-[13px] text-critical">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Couldn&apos;t reach the API ({error}). Is <code className="rounded bg-white/60 px-1 py-0.5">npm run dev:api</code> running on
            port 3001?
          </span>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-ink-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                filter === f.key ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              {f.label}
              <span
                className={`tabular rounded-full px-1.5 text-[11px] ${
                  filter === f.key ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-400"
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reason or comment…"
            className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-8 pr-3 text-[13px] placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
          <h2 className="text-[14px] font-semibold text-ink-900">
            {activeFilter.label} returns
            <span className="ml-2 font-normal text-ink-400">({filtered.length})</span>
          </h2>
          <button onClick={load} className="text-ink-300 transition hover:text-ink-500" aria-label="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2.5 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <PackageOpen size={20} />
            </span>
            <p className="text-[13.5px] font-medium text-ink-700">No returns match</p>
            <p className="text-[13px] text-ink-400">
              {returns.length === 0 ? "Start one from the customer return flow to see it here." : "Try a different filter or search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="text-[12px] uppercase tracking-wide text-ink-400">
                  <th className="px-6 py-2.5 font-medium">Created</th>
                  <th className="px-6 py-2.5 font-medium">Reason</th>
                  <th className="px-6 py-2.5 font-medium">Status</th>
                  <th className="px-6 py-2.5 font-medium">Resolution</th>
                  <th className="px-6 py-2.5 font-medium">Original</th>
                  <th className="px-6 py-2.5 font-medium">Recovered</th>
                  <th className="px-6 py-2.5 font-medium">Refunded</th>
                  <th className="px-6 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-ink-100">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-6 py-3.5">
                          <div className="skeleton h-4 w-16" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-ink-100 transition hover:bg-ink-50/60">
                    <td className="tabular px-6 py-3.5 text-ink-500">{formatDate(r.createdAt)}</td>
                    <td className="px-6 py-3.5 text-ink-700">
                      <span className="capitalize">{r.reason.replace(/_/g, " ")}</span>
                      {r.customerComment && (
                        <p className="mt-0.5 max-w-[220px] truncate text-[12px] font-normal normal-case text-ink-400">
                          “{r.customerComment}”
                        </p>
                      )}
                    </td>
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
                    <td className="tabular px-6 py-3.5 text-ink-500">
                      {r.refundedValue > 0 ? `$${r.refundedValue.toFixed(2)}` : <span className="text-ink-300">—</span>}
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
          </div>
        )}
      </div>
    </AppShell>
  );
}
