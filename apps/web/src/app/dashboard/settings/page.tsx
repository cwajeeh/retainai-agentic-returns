"use client";

import { useEffect, useState } from "react";
import { api, DEMO_MERCHANT_ID } from "@/lib/api";
import type { IntegrationStatus, MerchantSettings } from "@retainai/shared";
import { AppShell } from "@/components/AppShell";
import { AlertTriangle, Bot, Store, Truck, type LucideIcon } from "lucide-react";

function ModeBadge({ mode }: { mode: IntegrationStatus["mode"] }) {
  const isLive = mode === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${
        isLive ? "bg-good-bg text-good" : "bg-ink-100 text-ink-500"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-good" : "bg-ink-400"}`} />
      {isLive ? "Live" : "Mock"}
    </span>
  );
}

function IntegrationRow({
  icon: Icon,
  title,
  description,
  status,
  envHint,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  status: IntegrationStatus;
  envHint: string;
}) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
          <Icon size={16} strokeWidth={2} />
        </span>
        <div>
          <p className="text-[13.5px] font-medium text-ink-900">{title}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-400">{description}</p>
          {status.mode === "mock" && (
            <p className="mt-1 text-[11.5px] text-ink-300">
              Set <code className="rounded bg-ink-50 px-1 py-0.5 text-ink-500">{envHint}</code> to go live.
            </p>
          )}
        </div>
      </div>
      <ModeBadge mode={status.mode} />
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMerchantSettings(DEMO_MERCHANT_ID)
      .then(setSettings)
      .catch((err) => setError(String(err.message ?? err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Settings" subtitle="Store details & integration status">
      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-critical/20 bg-critical-bg px-4 py-3 text-[13px] text-critical">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Couldn&apos;t reach the API ({error}). Is <code className="rounded bg-white/60 px-1 py-0.5">npm run dev:api</code> running on
            port 3001?
          </span>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="border-b border-ink-200 px-6 py-4">
          <h2 className="text-[14px] font-semibold text-ink-900">Store</h2>
        </div>
        {loading || !settings ? (
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-40" />
              <div className="skeleton h-3 w-24" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Store size={16} strokeWidth={2} />
              </span>
              <div>
                <p className="text-[13.5px] font-medium text-ink-900">{settings.merchant.shopDomain}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-400">
                  Installed {new Date(settings.merchant.installedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-medium capitalize text-brand-700">
                {settings.merchant.planTier} plan
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                  settings.merchant.isActive ? "bg-good-bg text-good" : "bg-ink-100 text-ink-500"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${settings.merchant.isActive ? "bg-good" : "bg-ink-400"}`} />
                {settings.merchant.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="border-b border-ink-200 px-6 py-4">
          <h2 className="text-[14px] font-semibold text-ink-900">Integrations</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-400">
            Every external dependency runs against a local mock until you supply real credentials — nothing here needs a live
            account to try the product.
          </p>
        </div>

        {loading || !settings ? (
          <div className="divide-y divide-ink-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4">
                <div className="skeleton h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton h-3 w-56" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            <IntegrationRow
              icon={Store}
              title="Shopify"
              description="Product catalog, inventory, and order sync."
              status={settings.integrations.shopify}
              envHint="SHOPIFY_MODE=live"
            />
            <IntegrationRow
              icon={Bot}
              title="AI Negotiator"
              description="GPT-4o negotiates exchanges and upsells with the customer."
              status={settings.integrations.ai}
              envHint="AI_MODE=live"
            />
            <IntegrationRow
              icon={Truck}
              title="DHL"
              description="Return shipping label generation."
              status={settings.integrations.shipping.dhl}
              envHint="DHL_MODE=live"
            />
            <IntegrationRow
              icon={Truck}
              title="FedEx"
              description="Return shipping label generation."
              status={settings.integrations.shipping.fedex}
              envHint="FEDEX_MODE=live"
            />
            <IntegrationRow
              icon={Truck}
              title="UPS"
              description="Return shipping label generation."
              status={settings.integrations.shipping.ups}
              envHint="UPS_MODE=live"
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
