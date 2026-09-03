"""
The real AI Negotiator: GPT-4o with function calling against live inventory.

Two-step design:
  1. A tool-calling conversation loop where the model can call
     check_variant_stock / find_exchange_alternatives / find_upsell_candidates
     against the real database before replying to the customer in natural
     language (this is the "Agentic AI" piece from the business plan).
  2. A short structured follow-up call that turns the free-form reply plus
     everything the model saw into a strict `action` + `sentiment` the rest
     of the system (negotiation engine, dashboard) can act on. Function
     calling could return this directly via a final forced tool call, but
     splitting it out keeps the customer-facing reply natural while keeping
     the state machine deterministic.
"""

import json
from openai import OpenAI
from .config import settings
from .schemas import NegotiateRequest, NegotiateResponse, FunctionCallLog
from .tools import TOOL_SCHEMAS, dispatch_tool_call

SYSTEM_PROMPT = """You are RetainAI's Negotiator, an AI agent embedded in a Shopify store's \
return flow. Your job is to save the sale: instead of defaulting to a refund, \
figure out whether an exchange (same item, different size/color) or an \
upsell (a better/related in-stock item) would make the customer happy, using \
real-time inventory lookups. Be warm, brief, and genuinely helpful — never \
pushy. If the customer is frustrated or the item is defective, prioritize \
resolving their problem over saving the sale; a forced upsell to an angry \
customer will backfire. If nothing suitable is in stock, or the customer \
clearly wants a refund after you've offered an alternative, approve the \
refund gracefully. Keep replies to 2-3 sentences."""


def run_negotiation(req: NegotiateRequest) -> NegotiateResponse:
    client = OpenAI(api_key=settings.openai_api_key)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.append(
        {
            "role": "system",
            "content": (
                f"Context: return reason='{req.reason}', customer comment="
                f"{req.customerComment!r}, item='{req.order.lineItem.title}' "
                f"(variant_id={req.order.lineItem.variantId}, product_id={req.order.lineItem.productId}, "
                f"price=${req.order.lineItem.price}), merchant_id={req.merchantId}. "
                f"When looking up exchange alternatives, pass this product_id so same-product "
                f"matches (e.g. a different size) are preferred over unrelated products."
            ),
        }
    )
    for turn in req.conversationHistory:
        messages.append({"role": "user" if turn.role == "customer" else "assistant", "content": turn.content})

    function_calls: list[FunctionCallLog] = []

    for _ in range(4):  # cap tool-call rounds to bound latency/cost
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
        )
        choice = resp.choices[0]
        messages.append(choice.message.model_dump(exclude_none=True))

        if not choice.message.tool_calls:
            reply_text = choice.message.content or "Let me take another look at your options."
            break

        for tool_call in choice.message.tool_calls:
            args = json.loads(tool_call.function.arguments or "{}")
            result = dispatch_tool_call(tool_call.function.name, args)
            function_calls.append(FunctionCallLog(name=tool_call.function.name, arguments=args, result=result))
            messages.append(
                {"role": "tool", "tool_call_id": tool_call.id, "content": json.dumps(result)}
            )
    else:
        reply_text = "Let me get a teammate to help finish this up for you."

    action_and_sentiment = _classify_outcome(client, req, reply_text, function_calls)

    return NegotiateResponse(
        reply=reply_text,
        sentiment=action_and_sentiment["sentiment"],
        action=action_and_sentiment["action"],
        functionCalls=function_calls,
    )


def _classify_outcome(client: OpenAI, req: NegotiateRequest, reply_text: str, function_calls: list[FunctionCallLog]) -> dict:
    """A small structured-output call to pin down sentiment + the concrete
    action the rest of RetainAI should take, given the negotiator's reply."""
    tool_summary = "\n".join(f"- {fc.name}({fc.arguments}) -> {fc.result}" for fc in function_calls) or "(none)"

    classify_prompt = f"""Given this customer-service reply from an AI return negotiator, classify the
outcome as strict JSON matching this schema:
{{
  "sentiment": "positive" | "neutral" | "frustrated" | "angry",
  "action": {{"type": "propose_exchange", "variantId": str, "title": str, "priceDelta": number}}
            | {{"type": "propose_upsell", "variantId": str, "title": str, "priceDelta": number}}
            | {{"type": "approve_refund"}}
            | {{"type": "continue"}}
}}

Return reason: {req.reason}
Customer comment: {req.customerComment!r}
Original item price: {req.order.lineItem.price}
Tool calls made this turn:
{tool_summary}

Negotiator's reply to the customer:
\"\"\"{reply_text}\"\"\"

Respond with ONLY the JSON object, no prose."""

    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=[{"role": "user", "content": classify_prompt}],
        response_format={"type": "json_object"},
        temperature=0,
    )
    try:
        return json.loads(resp.choices[0].message.content)
    except (json.JSONDecodeError, TypeError):
        return {"sentiment": "neutral", "action": {"type": "continue"}}
