"""
Real-time inventory access for the AI Negotiator's function-calling tools.

The AI service reads directly from the same Postgres/Supabase database the
Node API writes to (see packages/db/migrations) — this is what lets the
negotiator check live stock and propose an in-stock alternative in the same
turn, per the "real-time inventory orchestration" pitch in the business plan.
It never writes; all mutations (inventory decrements, order edits) happen in
apps/api once the customer accepts a proposal, so there is a single writer.
"""

import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from .config import settings


@contextmanager
def get_conn():
    conn = psycopg2.connect(settings.database_url)
    try:
        yield conn
    finally:
        conn.close()


def get_variant_stock(variant_id: str) -> int | None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("select inventory_quantity from product_variants where id = %s", (variant_id,))
            row = cur.fetchone()
            return row[0] if row else None


def find_alternatives(merchant_id: str, product_id: str | None, exclude_variant_id: str, limit: int = 5):
    """In-stock alternatives for an exchange, same-product matches ranked first
    (e.g. a different size of the same jacket) before falling back to other
    products from the same merchant. Mirrors
    apps/api/src/db/queries.ts::findAlternativeVariants so both services agree."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                select pv.id, pv.title, pv.price, pv.inventory_quantity, pv.sku,
                       (p.id = %s) as same_product
                from product_variants pv
                join products p on p.id = pv.product_id
                where p.merchant_id = %s and pv.id != %s and pv.inventory_quantity > 0
                order by same_product desc, pv.inventory_quantity desc
                limit %s
                """,
                (product_id, merchant_id, exclude_variant_id, limit),
            )
            return [dict(r) for r in cur.fetchall()]


def find_upsell_candidates(merchant_id: str, min_price: float, limit: int = 5):
    """In-stock variants priced at or above the returned item — candidates for an upsell offer."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                select pv.id, pv.title, pv.price, pv.inventory_quantity, pv.sku
                from product_variants pv
                join products p on p.id = pv.product_id
                where p.merchant_id = %s and pv.price >= %s and pv.inventory_quantity > 0
                order by pv.price asc
                limit %s
                """,
                (merchant_id, min_price, limit),
            )
            return [dict(r) for r in cur.fetchall()]
