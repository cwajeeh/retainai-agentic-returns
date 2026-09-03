import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RetainAI",
  description: "Agentic returns & sales recovery for Shopify merchants",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
