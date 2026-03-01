import { NextResponse } from "next/server";
import { listResources } from "@/services/azure/resources";
import { discoverRelationships } from "@/services/azure/relationships";
import {
  AzureAuthError,
  AzureServiceError,
} from "@/services/azure/subscriptions";
import { AzureEnvError } from "@/services/azure/env";
import type { ResourceGraphResponse } from "@/types/azure";

export async function GET(
  _request: Request,
  { params }: { params: { subscriptionId: string } }
) {
  const { subscriptionId } = params;

  try {
    const nodes = await listResources(subscriptionId);
    const edges = discoverRelationships(nodes);

    const response: ResourceGraphResponse = {
      subscriptionId,
      graph: { nodes, edges },
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const details =
      process.env.NODE_ENV === "development" ? { details: message } : {};

    if (err instanceof AzureEnvError) {
      return NextResponse.json(
        { error: "Azure credentials not configured", ...details },
        { status: 500 }
      );
    }

    if (err instanceof AzureAuthError) {
      return NextResponse.json(
        { error: "Azure authentication failed", ...details },
        { status: 401 }
      );
    }

    if (err instanceof AzureServiceError) {
      const status = err.statusCode === 429 ? 429 : 503;
      return NextResponse.json(
        { error: "Azure service unavailable", ...details },
        { status }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch resources", ...details },
      { status: 500 }
    );
  }
}
