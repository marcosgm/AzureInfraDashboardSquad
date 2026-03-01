# Decision: Backend Error Handling Strategy

**Author:** Lovell (Backend Dev)
**Date:** 2026-03-01

## Context
The scaffolded backend returned HTTP 500 for all error types. The API route needed differentiated error responses so the frontend can show appropriate messages.

## Decision
Introduced typed error classes in the Azure service layer:
- `AzureEnvError` — missing credentials configuration
- `AzureAuthError` — Azure rejected credentials (401/403)
- `AzureServiceError` — Azure API failures, rate limits, network errors

The API route maps these to distinct HTTP status codes:
| Error Type | HTTP Status |
|---|---|
| `AzureEnvError` | 500 (server misconfiguration) |
| `AzureAuthError` | 401 (unauthorized) |
| `AzureServiceError` (rate limit) | 429 |
| `AzureServiceError` (other) | 503 (service unavailable) |
| Unknown | 500 |

Error details are only exposed in development mode (`NODE_ENV=development`).

## Impact
- **Frontend (Swigert):** Can now distinguish error types by HTTP status code to show targeted UI messages.
- **Testing (Haise):** Error classes are exported and can be mocked/asserted in tests.
