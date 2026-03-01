import { DefaultAzureCredential } from "@azure/identity";
import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import { RestError } from "@azure/core-rest-pipeline";
import cache from "@/services/cache";
import { validateAzureEnv, AzureEnvError } from "@/services/azure/env";
import type { AzureSubscription } from "@/types/azure";

const CACHE_KEY = "azure:subscriptions";

export { AzureEnvError };

export class AzureAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AzureAuthError";
  }
}

export class AzureServiceError extends Error {
  public statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "AzureServiceError";
    this.statusCode = statusCode;
  }
}

export async function listSubscriptions(): Promise<AzureSubscription[]> {
  const cached = cache.get<AzureSubscription[]>(CACHE_KEY);
  if (cached) {
    console.log("[azure] Cache hit for subscriptions");
    return cached;
  }

  console.log("[azure] Cache miss — fetching subscriptions from Azure");

  validateAzureEnv();

  let client: SubscriptionClient;
  try {
    const credential = new DefaultAzureCredential();
    client = new SubscriptionClient(credential);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[azure] Authentication failed:", msg);
    throw new AzureAuthError(`Azure authentication failed: ${msg}`);
  }

  try {
    const subscriptions: AzureSubscription[] = [];
    for await (const sub of client.subscriptions.list()) {
      subscriptions.push({
        id: sub.id ?? "",
        subscriptionId: sub.subscriptionId ?? "",
        displayName: sub.displayName ?? "",
        state: sub.state ?? "Unknown",
        tenantId: sub.tenantId ?? "",
      });
    }

    console.log(`[azure] Fetched ${subscriptions.length} subscription(s)`);
    cache.set(CACHE_KEY, subscriptions);
    return subscriptions;
  } catch (err) {
    if (err instanceof RestError) {
      const status = err.statusCode;
      console.error(`[azure] REST error ${status}: ${err.message}`);

      if (status === 401 || status === 403) {
        throw new AzureAuthError(
          `Azure authorization failed (${status}): ${err.message}`
        );
      }
      if (status === 429) {
        throw new AzureServiceError("Azure rate limit exceeded — retry later", 429);
      }
      throw new AzureServiceError(
        `Azure API error (${status}): ${err.message}`,
        status
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    console.error("[azure] Unexpected error:", msg);
    throw new AzureServiceError(`Azure request failed: ${msg}`);
  }
}
