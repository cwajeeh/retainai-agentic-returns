"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DEMO_MERCHANT_ID } from "@/lib/api";
import type { OrderLineItem, ReturnReason } from "@retainai/shared";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  HelpCircle,
  Loader2,
  PackageX,
  Palette,
  Ruler,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";

const REASONS: { value: ReturnReason; label: string; icon: LucideIcon }[] = [
  { value: "wrong_size", label: "Wrong size", icon: Ruler },
  { value: "wrong_color", label: "Wrong color", icon: Palette },
  { value: "changed_mind", label: "Changed my mind", icon: XCircle },
  { value: "defective", label: "Item is defective", icon: AlertTriangle },
  { value: "not_as_described", label: "Not as described", icon: HelpCircle },
  { value: "arrived_late", label: "Arrived too late", icon: Clock },
  { value: "other", label: "Other", icon: PackageX },
];

export default function StartReturnPage({ params }: { params: { lineItemId: string } }) {
  const router = useRouter();
  const [reason, setReason] = useState<ReturnReason>("wrong_size");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<OrderLineItem | null>(null);
  const [itemError, setItemError] = useState(false);

  useEffect(() => {
    api
      .getLineItem(params.lineItemId)
      .then((res) => setItem(res.lineItem))
      .catch(() => setItemError(true));
  }, [params.lineItemId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const returnRequest = await api.createReturn({
        merchantId: DEMO_MERCHANT_ID,
        lineItemId: params.lineItemId,
        reason,
        customerComment: comment || undefined,
      });
      router.push(`/return/chat/${returnRequest.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 text-white">
            <Sparkles size={13} strokeWidth={2.25} />
          </span>
          <span className="text-[13px] font-semibold tracking-tight text-ink-900">RetainAI</span>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-7">
          <h1 className="text-[19px] font-semibold tracking-tight text-ink-900">Start a return</h1>
          <p className="mt-1 text-[13.5px] text-ink-400">Tell us what's going on and we'll sort it out.</p>

          {!itemError && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
              {item ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-300">
                  <PackageX size={18} />
                </div>
              ) : (
                <div className="skeleton h-11 w-11 shrink-0 rounded-lg" />
              )}
              <div className="min-w-0 flex-1">
                {item ? (
                  <>
                    <p className="truncate text-[13.5px] font-medium text-ink-900">{item.title}</p>
                    <p className="tabular text-[12.5px] text-ink-400">
                      Qty {item.quantity} · ${item.price.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="skeleton mb-1.5 h-3.5 w-32" />
                    <div className="skeleton h-3 w-20" />
                  </>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-ink-700">Reason for return</label>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((r) => {
                  const Icon = r.icon;
                  const active = reason === r.value;
                  return (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition ${
                        active
                          ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                          : "border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50"
                      }`}
                    >
                      <Icon size={15} className={active ? "text-brand-600" : "text-ink-400"} />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-ink-700">Anything else? (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="e.g. It runs a bit small"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-critical-bg px-3 py-2 text-[13px] text-critical">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Starting…
                </>
              ) : (
                <>
                  Continue <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
