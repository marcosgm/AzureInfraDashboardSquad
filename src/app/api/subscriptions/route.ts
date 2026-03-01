import { NextResponse } from "next/server";
import {
  listSubscriptions,
  AzureAuthError,
  AzureEnvError,
  AzureServiceError,
} from "@/services/azure/subscriptions";

export async function GET() {
  try {
    const subscriptions = await listSubscriptions();
    return NextResponse.json({ subscriptions });
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
      { error: "Failed to fetch subscriptions", ...details },
      { status: 500 }
    );
  }
}
