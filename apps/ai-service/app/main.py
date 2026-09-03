from fastapi import FastAPI, HTTPException
from .config import settings
from .schemas import NegotiateRequest, NegotiateResponse

app = FastAPI(title="RetainAI AI Negotiator")


@app.get("/health")
def health():
    return {"ok": True, "service": "retainai-ai-service", "mode": "live" if settings.is_live else "mock"}


@app.post("/negotiate", response_model=NegotiateResponse)
def negotiate(req: NegotiateRequest):
    try:
        if settings.is_live:
            from .negotiator_live import run_negotiation
        else:
            from .negotiator_mock import run_negotiation
        return run_negotiation(req)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
