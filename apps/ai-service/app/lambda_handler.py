"""
AWS Lambda entrypoint for the AI Negotiator (see infra/serverless.yml).
Deployed as a container image (built from the Dockerfile in this
directory) rather than a zip, since psycopg2/openai's native
dependencies are painful to get right in a Lambda zip layer — a
container image just runs the same image you can `docker run` locally.

Same Postgres-pooling caveat as apps/api/src/lambda.ts: point
DATABASE_URL at a pooled connection string in production.
"""

from mangum import Mangum
from .main import app

handler = Mangum(app)
