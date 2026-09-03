from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel

ReturnReason = Literal[
    "wrong_size",
    "wrong_color",
    "changed_mind",
    "defective",
    "not_as_described",
    "arrived_late",
    "other",
]

Sentiment = Literal["positive", "neutral", "frustrated", "angry"]


class ConversationTurn(BaseModel):
    role: Literal["customer", "agent"]
    content: str


class LineItem(BaseModel):
    id: str
    shopifyLineItemId: str
    productId: Optional[str] = None
    variantId: Optional[str] = None
    title: str
    quantity: int
    price: float


class OrderContext(BaseModel):
    lineItem: LineItem


class NegotiateRequest(BaseModel):
    merchantId: str
    returnRequestId: str
    reason: ReturnReason
    customerComment: Optional[str] = None
    conversationHistory: List[ConversationTurn] = []
    order: OrderContext


class ExchangeAction(BaseModel):
    type: Literal["propose_exchange"] = "propose_exchange"
    variantId: str
    title: str
    priceDelta: float


class UpsellAction(BaseModel):
    type: Literal["propose_upsell"] = "propose_upsell"
    variantId: str
    title: str
    priceDelta: float


class RefundAction(BaseModel):
    type: Literal["approve_refund"] = "approve_refund"


class ContinueAction(BaseModel):
    type: Literal["continue"] = "continue"


Action = ExchangeAction | UpsellAction | RefundAction | ContinueAction


class FunctionCallLog(BaseModel):
    name: str
    arguments: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None


class NegotiateResponse(BaseModel):
    reply: str
    sentiment: Sentiment
    action: Action
    functionCalls: List[FunctionCallLog] = []
