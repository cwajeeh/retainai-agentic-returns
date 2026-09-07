"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Negotiation, ReturnRequest } from "@retainai/shared";
import { AlertTriangle, CheckCircle2, PackageCheck, Repeat, Send, Sparkles, TrendingUp, Truck } from "lucide-react";

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
  }, [data?.negotiation?.messages.length, sending]);

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
  const visibleMessages = negotiation?.messages.filter((m) => m.role !== "system") ?? [];

  return (
    <main className="flex min-h-screen justify-center bg-ink-50 px-4 py-6">
      <div className="flex w-full max-w-lg flex-col">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Sparkles size={15} strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-[14px] font-semibold leading-tight text-ink-900">Return assistant</p>
            <p className="text-[12px] text-ink-400">Usually replies in a few seconds</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
            {!negotiation && (
              <div className="flex items-center gap-2 text-[13px] text-ink-400">
                <TypingDots /> Starting the conversation…
              </div>
            )}
            {visibleMessages.map((m) => (
              <div key={m.id} className={`flex items-end gap-2 ${m.role === "customer" ? "justify-end" : "justify-start"}`}>
                {m.role === "agent" && (
                  <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Sparkles size={12} strokeWidth={2.25} />
                  </span>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                    m.role === "customer"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm bg-ink-100 text-ink-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1].role === "customer" && (
              <div className="flex items-end gap-2">
                <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Sparkles size={12} strokeWidth={2.25} />
                </span>
                <div className="rounded-2xl rounded-bl-sm bg-ink-100 px-3.5 py-2.5">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {hasProposal && !isResolved && (
            <div className="border-t border-ink-200 bg-brand-50/60 p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                  {negotiation?.proposedVariantId ? <Repeat size={14} /> : <TrendingUp size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink-900">We've got an alternative for you</p>
                  <p className="text-[12.5px] text-ink-500">Take a look above, then accept below — or just keep chatting.</p>
                </div>
              </div>
              <div className="mt-2.5 flex gap-2">
                {negotiation?.proposedVariantId && (
                  <button
                    onClick={() => handleAccept("exchange")}
                    disabled={sending}
                    className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    Accept exchange
                  </button>
                )}
                {negotiation?.proposedUpsellVariantId && (
                  <button
                    onClick={() => handleAccept("upsell")}
                    disabled={sending}
                    className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    Accept upgrade
                  </button>
                )}
              </div>
            </div>
          )}

          {isResolved && (
            <div className="border-t border-ink-200 bg-good-bg/60 p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-good shadow-sm">
                  {data?.resolution === "refund" ? <Truck size={14} /> : <PackageCheck size={14} />}
                </span>
                <div>
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-900">
                    <CheckCircle2 size={13} className="text-good" />
                    Return resolved — {data?.resolution.replace(/_/g, " ")}
                  </p>
                  <p className="text-[12.5px] text-ink-500">
                    {data?.status === "completed" || data?.status === "label_generated"
                      ? "A prepaid return label is on its way to your email."
                      : `Status: ${data?.status.replace(/_/g, " ")}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 border-t border-ink-200 bg-critical-bg px-3.5 py-2 text-[12.5px] text-critical">
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim()) return;
              const msg = input;
              setInput("");
              sendMessage(msg);
            }}
            className="flex gap-2 border-t border-ink-200 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              disabled={sending || Boolean(isResolved)}
              className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-[13.5px] placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50"
            />
            <button
              type="submit"
              disabled={sending || Boolean(isResolved) || !input.trim()}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300" />
    </span>
  );
}
