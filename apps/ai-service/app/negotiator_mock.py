"""
Deterministic, rule-based stand-in for the GPT-4o negotiator. Used whenever
AI_MODE != "live" (no OpenAI key configured) so the full return -> negotiate
-> exchange -> label flow can be demoed and tested offline / in CI, and so
reviewers without an OpenAI key can still see the real system working
end-to-end. Still calls the same live-inventory tool functions as the real
negotiator, so the "agentic" data flow is exercised, just with a scripted
decision layer instead of an LLM.
"""

from .schemas import NegotiateRequest, NegotiateResponse, FunctionCallLog
from . import tools

FRUSTRATED_WORDS = ["angry", "furious", "terrible", "worst", "unacceptable", "ridiculous", "hate"]
NEGATIVE_WORDS = ["disappointed", "annoyed", "frustrat", "upset", "bad"]


def _detect_sentiment(text: str | None) -> str:
    if not text:
        return "neutral"
    lowered = text.lower()
    if any(w in lowered for w in FRUSTRATED_WORDS):
        return "angry"
    if any(w in lowered for w in NEGATIVE_WORDS):
        return "frustrated"
    if any(w in lowered for w in ["thanks", "great", "awesome", "love"]):
        return "positive"
    return "neutral"


def run_negotiation(req: NegotiateRequest) -> NegotiateResponse:
    latest_customer_msg = next((t.content for t in reversed(req.conversationHistory) if t.role == "customer"), req.customerComment or "")
    sentiment = _detect_sentiment(latest_customer_msg)
    function_calls: list[FunctionCallLog] = []

    # Defective items or an angry customer: don't try to upsell, just make it right.
    if req.reason == "defective" or sentiment == "angry":
        return NegotiateResponse(
            reply=(
                "I'm really sorry about that — that's not the experience we want you to have. "
                "I've gone ahead and approved a full refund; you'll also get a prepaid return label."
            ),
            sentiment=sentiment,
            action={"type": "approve_refund"},
            functionCalls=function_calls,
        )

    # "Says the customer wants a refund" after we've already made an offer this thread.
    already_offered = any("how about" in t.content.lower() or "we have" in t.content.lower() for t in req.conversationHistory if t.role == "agent")
    wants_refund_now = any(w in latest_customer_msg.lower() for w in ["just refund", "no thanks", "just want my money", "refund please"])
    if already_offered and wants_refund_now:
        return NegotiateResponse(
            reply="No problem at all — I've approved your refund. You'll get a prepaid label by email shortly.",
            sentiment=sentiment,
            action={"type": "approve_refund"},
            functionCalls=function_calls,
        )

    if req.reason in ("wrong_size", "wrong_color"):
        args = {
            "merchant_id": req.merchantId,
            "product_id": req.order.lineItem.productId,
            "exclude_variant_id": req.order.lineItem.variantId or "",
        }
        result = tools.dispatch_tool_call("find_exchange_alternatives", args)
        function_calls.append(FunctionCallLog(name="find_exchange_alternatives", arguments=args, result=result))
        alternatives = result.get("alternatives", [])
        if alternatives:
            best = alternatives[0]
            price_delta = round(float(best["price"]) - req.order.lineItem.price, 2)
            return NegotiateResponse(
                reply=(
                    f"Totally understand — sizing/color can be tricky online. Good news: we have "
                    f"\"{best['title']}\" in stock right now. Want me to send that instead? "
                    f"{'No extra cost.' if price_delta <= 0 else f'It is ${price_delta} more.'}"
                ),
                sentiment=sentiment,
                action={
                    "type": "propose_exchange",
                    "variantId": best["id"],
                    "title": best["title"],
                    "priceDelta": price_delta,
                },
                functionCalls=function_calls,
            )

    if req.reason in ("changed_mind", "not_as_described", "arrived_late", "other"):
        args = {"merchant_id": req.merchantId, "min_price": req.order.lineItem.price}
        result = tools.dispatch_tool_call("find_upsell_candidates", args)
        function_calls.append(FunctionCallLog(name="find_upsell_candidates", arguments=args, result=result))
        candidates = [c for c in result.get("candidates", []) if c["id"] != req.order.lineItem.variantId]
        if candidates:
            best = candidates[0]
            price_delta = round(float(best["price"]) - req.order.lineItem.price, 2)
            return NegotiateResponse(
                reply=(
                    f"Before we process a refund — a lot of customers in your situation love "
                    f"\"{best['title']}\" instead. It's in stock now"
                    f"{f' for just ${price_delta} more' if price_delta > 0 else ''}. Interested, or would you "
                    f"still like the refund?"
                ),
                sentiment=sentiment,
                action={
                    "type": "propose_upsell",
                    "variantId": best["id"],
                    "title": best["title"],
                    "priceDelta": price_delta,
                },
                functionCalls=function_calls,
            )

    return NegotiateResponse(
        reply="Got it — I've approved a refund for this item. You'll receive a prepaid return label by email.",
        sentiment=sentiment,
        action={"type": "approve_refund"},
        functionCalls=function_calls,
    )
