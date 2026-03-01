import { DefaultAzureCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";
import { RestError } from "@azure/core-rest-pipeline";
import cache from "@/services/cache";
import { validateAzureEnv } from "@/services/azure/env";
import { AzureAuthError, AzureServiceError } from "@/services/azure/subscriptions";
import type { AzureResource } from "@/types/azure";

function cacheKey(subscriptionId: string): string {
  return `azure:resources:${subscriptionId}`;
}

function parseResourceGroup(resourceId: string): string {
  const match = resourceId.match(/\/resourceGroups\/([^/]+)/i);
  return match?.[1] ?? "unknown";
}

export async function listResources(subscriptionId: string): Promise<AzureResource[]> {
  const key = cacheKey(subscriptionId);
  const cached = cache.get<AzureResource[]>(key);
  if (cached) {
    console.log(`[azure] Cache hit for resources (${subscriptionId})`);
    return cached;
  }

  console.log(`[azure] Cache miss — fetching resources for subscription ${subscriptionId}`);

  validateAzureEnv();

  let client: ResourceManagementClient;
  try {
    const credential = new DefaultAzureCredential();
    client = new ResourceManagementClient(credential, subscriptionId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[azure] Authentication failed:", msg);
    throw new AzureAuthError(`Azure authentication failed: ${msg}`);
  }

  try {
    const resources: AzureResource[] = [];
    for await (const res of client.resources.list()) {
      resources.push({
        id: res.id ?? "",
        name: res.name ?? "",
        type: res.type ?? "",
        resourceGroup: parseResourceGroup(res.id ?? ""),
        location: res.location ?? "",
      });
    }

    console.log(`[azure] Fetched ${resources.length} resource(s) for subscription ${subscriptionId}`);
    cache.set(key, resources);
    return resources;
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
