"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, DEMO_MERCHANT_ID } from "@/lib/api";
import type { ReturnReason } from "@retainai/shared";

const REASONS: { value: ReturnReason; label: string }[] = [
  { value: "wrong_size", label: "Wrong size" },
  { value: "wrong_color", label: "Wrong color" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "defective", label: "Item is defective" },
  { value: "not_as_described", label: "Not as described" },
  { value: "arrived_late", label: "Arrived too late" },
  { value: "other", label: "Other" },
];

export default function StartReturnPage({ params }: { params: { lineItemId: string } }) {
  const router = useRouter();
  const [reason, setReason] = useState<ReturnReason>("wrong_size");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Start a return</p>
      <h1 className="mb-6 text-2xl font-bold">Tell us what's going on</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Reason for return</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReturnReason)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Anything else? (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. It runs a bit small"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
