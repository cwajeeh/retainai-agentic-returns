import { createApp } from "./app";
import { config } from "./config";

// This entrypoint is for local dev / a long-running container (docker-compose,
// ECS, etc). The AWS Lambda deployment target uses src/lambda.ts instead,
// which wraps the same createApp() Express app with serverless-http — see
// infra/ for the Lambda + API Gateway config.
const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`RetainAI API listening on :${config.port} (Shopify=${config.shopify.live ? "live" : "mock"}, AI=${config.ai.live ? "live" : "mock"})`);
});
