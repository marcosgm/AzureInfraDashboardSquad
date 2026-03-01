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

/** A single Azure resource discovered in a subscription */
export interface AzureResource {
  id: string;
  name: string;
  type: string;
  resourceGroup: string;
  location: string;
}

/** A relationship between two resources */
export interface ResourceRelationship {
  sourceId: string;
  targetId: string;
  type: string;
}

/** Complete graph for diagram rendering */
export interface ResourceGraph {
  nodes: AzureResource[];
  edges: ResourceRelationship[];
}

/** API response wrapper */
export interface ResourceGraphResponse {
  subscriptionId: string;
  graph: ResourceGraph;
}

/** A single Azure resource discovered in a subscription */
export interface AzureResource {
  id: string;
  name: string;
  type: string;
  resourceGroup: string;
  location: string;
}

/** A relationship between two resources */
export interface ResourceRelationship {
  sourceId: string;
  targetId: string;
  type: string;
}

/** Complete graph for diagram rendering */
export interface ResourceGraph {
  nodes: AzureResource[];
  edges: ResourceRelationship[];
}

/** API response wrapper */
export interface ResourceGraphResponse {
  subscriptionId: string;
  graph: ResourceGraph;
}
