import axios from "axios";
import type { NegotiateRequest, NegotiateResponse } from "@retainai/shared";
import { config } from "../config";

/** Thin HTTP client for apps/ai-service (FastAPI). Keeps the contract in one place. */
export async function negotiate(req: NegotiateRequest): Promise<NegotiateResponse> {
  const res = await axios.post<NegotiateResponse>(`${config.ai.serviceUrl}/negotiate`, req, {
    timeout: 30_000,
  });
  return res.data;
}
