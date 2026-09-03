"use client";

export function RevenueSplitBar({ recovered, refunded }: { recovered: number; refunded: number }) {
  const total = recovered + refunded;
  const recoveredPct = total > 0 ? (recovered / total) * 100 : 0;
  const refundedPct = 100 - recoveredPct;

  return (
    <div className="w-full">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-emerald-500" style={{ width: `${recoveredPct}%` }} title={`Recovered: $${recovered.toFixed(2)}`} />
        <div className="h-full bg-slate-400" style={{ width: `${refundedPct}%` }} title={`Refunded: $${refunded.toFixed(2)}`} />
      </div>
      <div className="mt-2 flex justify-between text-sm text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenue saved: ${recovered.toFixed(2)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-400" /> Revenue refunded: ${refunded.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
