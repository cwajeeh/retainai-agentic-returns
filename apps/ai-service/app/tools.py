"""OpenAI function-calling tool definitions for the AI Negotiator, plus the
dispatcher that actually executes them against live inventory data."""

from typing import Any, Dict
from . import inventory

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "check_variant_stock",
            "description": "Check current live inventory quantity for a specific product variant.",
            "parameters": {
                "type": "object",
                "properties": {"variant_id": {"type": "string", "description": "The internal variant UUID."}},
                "required": ["variant_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_exchange_alternatives",
            "description": (
                "Look up in-stock alternative variants for this merchant that the customer could "
                "exchange into instead of returning for a refund (e.g. a different size)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "merchant_id": {"type": "string"},
                    "product_id": {
                        "type": "string",
                        "description": "The product the returned variant belongs to — same-product matches (e.g. a different size) are ranked first.",
                    },
                    "exclude_variant_id": {"type": "string", "description": "The variant being returned, to exclude from results."},
                },
                "required": ["merchant_id", "product_id", "exclude_variant_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_upsell_candidates",
            "description": (
                "Look up in-stock variants priced at or above the returned item's price, to offer as "
                "an upsell (a nicer/upgraded product) instead of a refund."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "merchant_id": {"type": "string"},
                    "min_price": {"type": "number", "description": "Minimum price to consider, typically the returned item's price."},
                },
                "required": ["merchant_id", "min_price"],
            },
        },
    },
]


def dispatch_tool_call(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    if name == "check_variant_stock":
        qty = inventory.get_variant_stock(arguments["variant_id"])
        return {"variant_id": arguments["variant_id"], "inventory_quantity": qty}
    if name == "find_exchange_alternatives":
        return {
            "alternatives": inventory.find_alternatives(
                arguments["merchant_id"], arguments.get("product_id"), arguments["exclude_variant_id"]
            )
        }
    if name == "find_upsell_candidates":
        return {"candidates": inventory.find_upsell_candidates(arguments["merchant_id"], arguments["min_price"])}
    raise ValueError(f"Unknown tool: {name}")
