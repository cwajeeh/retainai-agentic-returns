"use client";

// A single composition bar showing how return value split between recovered
// (exchanges + upsells) and refunded. Follows the dataviz method: status-style
// color (green = saved, neutral gray = lost) rather than an arbitrary
// categorical hue, a 3px surface gap between the two segments, rounded caps,
// direct value labels, a legend (required for >= 2 series), and a hover
// tooltip with the exact figures.

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function RevenueChart({ recovered, refunded }: { recovered: number; refunded: number }) {
  const total = recovered + refunded;
  const recoveredPct = total > 0 ? (recovered / total) * 100 : 50;
  const refundedPct = total > 0 ? 100 - recoveredPct : 50;
  const hasRecovered = recovered > 0 || total === 0;
  const hasRefunded = refunded > 0 || total === 0;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between text-[13px]">
        {hasRecovered && (
          <span className="font-semibold text-ink-900">
            {fmt(recovered)} <span className="font-normal text-ink-400">saved</span>
          </span>
        )}
        {hasRefunded && (
          <span className="font-semibold text-ink-900">
            {fmt(refunded)} <span className="font-normal text-ink-400">refunded</span>
          </span>
        )}
      </div>

      <div className="flex h-7 w-full gap-[3px]">
        {hasRecovered && (
          <div
            className="group relative"
            style={{ width: `${recoveredPct}%` }}
          >
            <div
              className={`h-full bg-good ${hasRefunded ? "rounded-l-full" : "rounded-full"}`}
              title={`Revenue saved: ${fmt(recovered)}`}
            />
            <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-popover transition group-hover:opacity-100">
              {fmt(recovered)} saved
            </div>
          </div>
        )}
        {hasRefunded && (
          <div className="group relative" style={{ width: `${refundedPct}%` }}>
            <div
              className={`h-full bg-ink-300 ${hasRecovered ? "rounded-r-full" : "rounded-full"}`}
              title={`Revenue refunded: ${fmt(refunded)}`}
            />
            <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-popover transition group-hover:opacity-100">
              {fmt(refunded)} refunded
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-5 text-[12.5px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-good" /> Revenue saved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink-300" /> Revenue refunded
        </span>
      </div>
    </div>
  );
}

export function RevenueChartSkeleton() {
  return (
    <div>
      <div className="mb-2 flex justify-between">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-24" />
      </div>
      <div className="skeleton h-7 w-full rounded-full" />
      <div className="mt-3 flex gap-5">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-3 w-24" />
      </div>
    </div>
  );
}
