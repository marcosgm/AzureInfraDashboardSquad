export interface AzureSubscription {
  id: string;
  subscriptionId: string;
  displayName: string;
  state: string;
  tenantId: string;
}

export interface SubscriptionsResponse {
  subscriptions: AzureSubscription[];
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
