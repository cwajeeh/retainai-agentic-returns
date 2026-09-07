import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink-500">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={15} strokeWidth={2.25} />
        </span>
      </div>
      <p className="tabular mt-3 text-[26px] font-semibold leading-none tracking-tight text-ink-900">{value}</p>
      {sub && <p className="mt-2 text-[12.5px] text-ink-400">{sub}</p>}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="skeleton h-3.5 w-20" />
        <div className="skeleton h-7 w-7 rounded-lg" />
      </div>
      <div className="skeleton mt-4 h-7 w-16" />
      <div className="skeleton mt-2.5 h-3 w-24" />
    </div>
  );
}
