import type { ReturnRequest } from "@retainai/shared";
import { CheckCircle2, CircleDashed, Loader2, PackageCheck, RotateCcw, XCircle, type LucideIcon } from "lucide-react";

const STATUS_CONFIG: Record<ReturnRequest["status"], { label: string; tone: "neutral" | "active" | "good" | "muted" }> = {
  requested: { label: "Requested", tone: "neutral" },
  negotiating: { label: "Negotiating", tone: "active" },
  exchange_accepted: { label: "Exchange accepted", tone: "good" },
  upsell_accepted: { label: "Upsell accepted", tone: "good" },
  refund_approved: { label: "Refund approved", tone: "neutral" },
  label_generated: { label: "Label generated", tone: "active" },
  completed: { label: "Completed", tone: "good" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-ink-100 text-ink-500",
  active: "bg-brand-50 text-brand-700",
  good: "bg-good-bg text-good",
  muted: "bg-ink-100 text-ink-400",
};

const TONE_ICON: Record<string, LucideIcon> = {
  neutral: CircleDashed,
  active: Loader2,
  good: CheckCircle2,
  muted: XCircle,
};

export function StatusBadge({ status }: { status: ReturnRequest["status"] }) {
  const config = STATUS_CONFIG[status];
  const Icon = TONE_ICON[config.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${TONE_CLASSES[config.tone]}`}>
      <Icon size={12} className={config.tone === "active" ? "animate-spin" : ""} />
      {config.label}
    </span>
  );
}

const RESOLUTION_ICON: Record<ReturnRequest["resolution"], LucideIcon> = {
  exchange: RotateCcw,
  upsell: PackageCheck,
  refund: XCircle,
  store_credit: PackageCheck,
  none_yet: CircleDashed,
};

export function ResolutionTag({ resolution }: { resolution: ReturnRequest["resolution"] }) {
  const Icon = RESOLUTION_ICON[resolution];
  const label = resolution.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] capitalize text-ink-700">
      <Icon size={13} className="text-ink-400" />
      {label === "none yet" ? "—" : label}
    </span>
  );
}
