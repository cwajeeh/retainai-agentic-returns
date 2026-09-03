"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Negotiation, ReturnRequest } from "@retainai/shared";

type ReturnWithNegotiation = ReturnRequest & { negotiation: Negotiation | null };

export default function NegotiationChatPage({ params }: { params: { returnId: string } }) {
  const [data, setData] = useState<ReturnWithNegotiation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const res = await api.getReturn(params.returnId);
    setData(res);
  }

  useEffect(() => {
    refresh().then(() => {
      // Kick off the negotiation automatically with an opening message so
      // the customer lands in an already-started conversation.
      if (!hasStarted.current) {
        hasStarted.current = true;
        sendMessage("Hi, I'd like to return this item.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasStarted = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.negotiation?.messages.length]);

  async function sendMessage(message: string) {
    setSending(true);
    setError(null);
    try {
      await api.sendMessage(params.returnId, message);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function handleAccept(type: "exchange" | "upsell") {
    setSending(true);
    try {
      await api.acceptProposal(params.returnId, type);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const negotiation = data?.negotiation;
  const hasProposal = Boolean(negotiation?.proposedVariantId || negotiation?.proposedUpsellVariantId);
  const isResolved = data && ["refund_approved", "label_generated", "completed"].includes(data.status);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">RetainAI</p>
        <h1 className="text-xl font-bold">Return assistant</h1>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {!negotiation && <p className="text-sm text-slate-400">Starting the conversation…</p>}
        {negotiation?.messages
          .filter((m) => m.role !== "system")
          .map((m) => (
            <div key={m.id} className={`flex ${m.role === "customer" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "customer" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        <div ref={bottomRef} />
      </div>

      {hasProposal && !isResolved && (
        <div className="mt-3 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex-1 text-sm text-emerald-800">We've proposed an alternative — accept it?</p>
          {negotiation?.proposedVariantId && (
            <button
              onClick={() => handleAccept("exchange")}
              disabled={sending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Accept exchange
            </button>
          )}
          {negotiation?.proposedUpsellVariantId && (
            <button
              onClick={() => handleAccept("upsell")}
              disabled={sending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Accept upgrade
            </button>
          )}
        </div>
      )}

      {isResolved && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          This return is resolved ({data?.resolution.replace(/_/g, " ")}). Status: {data?.status.replace(/_/g, " ")}.
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          const msg = input;
          setInput("");
          sendMessage(msg);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending || Boolean(isResolved)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={sending || Boolean(isResolved)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}
