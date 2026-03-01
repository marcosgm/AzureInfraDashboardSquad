const REQUIRED_ENV_VARS = [
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
] as const;

export class AzureEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `Missing required Azure environment variables: ${missing.join(", ")}. ` +
        `Set them in your environment or .env.local (never commit secrets to source control).`
    );
    this.name = "AzureEnvError";
  }
}

/**
 * Validates that all required Azure credential env vars are present.
 * Throws AzureEnvError with a clear message listing any missing vars.
 */
export function validateAzureEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]?.trim());
  if (missing.length > 0) {
    throw new AzureEnvError(missing);
  }
}
