"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PackageSearch, Settings, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/returns", label: "Returns", icon: PackageSearch, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white px-4 py-5 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Sparkles size={15} strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink-900">RetainAI</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition ${
                  active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Demo store</p>
          <p className="truncate text-[13px] font-medium text-ink-700">demo-store.myshopify.com</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-200 bg-white/80 px-6 py-4 backdrop-blur md:px-8">
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight text-ink-900">{title}</h1>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-400">{subtitle}</p>}
          </div>
          <Link
            href="/"
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-[13px] font-medium text-ink-500 transition hover:border-ink-300 hover:text-ink-900"
          >
            Exit demo
          </Link>
        </header>
        <main className="flex-1 px-6 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
