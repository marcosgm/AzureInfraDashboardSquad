import type { AzureResource, ResourceRelationship } from "@/types/azure";

/**
 * Known type pairs where source "uses" or "depends on" target.
 * Key: source resource type (lowercase), Value: { targetType, relationship }
 */
const KNOWN_TYPE_MAP: Record<string, { targetType: string; relationship: string }[]> = {
  "microsoft.compute/virtualmachines": [
    { targetType: "microsoft.network/networkinterfaces", relationship: "uses" },
  ],
  "microsoft.network/networkinterfaces": [
    { targetType: "microsoft.network/virtualnetworks/subnets", relationship: "attachedTo" },
  ],
  "microsoft.web/sites": [
    { targetType: "microsoft.web/serverfarms", relationship: "hostedOn" },
  ],
  "microsoft.sql/servers/databases": [
    { targetType: "microsoft.sql/servers", relationship: "childOf" },
  ],
};

/**
 * Infer parent/child relationships from resource ID containment.
 * If resource A's ID is a strict prefix of resource B's ID, A is B's parent.
 */
function discoverParentChild(resources: AzureResource[]): ResourceRelationship[] {
  const edges: ResourceRelationship[] = [];
  const sortedById = [...resources].sort((a, b) => a.id.length - b.id.length);

  for (let i = 0; i < sortedById.length; i++) {
    const parent = sortedById[i];
    for (let j = i + 1; j < sortedById.length; j++) {
      const child = sortedById[j];
      if (
        child.id.toLowerCase().startsWith(parent.id.toLowerCase() + "/")
      ) {
        // Only add direct parent — skip if there's a closer ancestor already added
        const hasCloserParent = edges.some(
          (e) =>
            e.targetId === child.id &&
            e.type === "contains" &&
            e.sourceId.length > parent.id.length
        );
        if (!hasCloserParent) {
          // Remove any less-specific parent edge for this child
          const existingIdx = edges.findIndex(
            (e) => e.targetId === child.id && e.type === "contains"
          );
          if (existingIdx !== -1) {
            edges[existingIdx] = {
              sourceId: parent.id,
              targetId: child.id,
              type: "contains",
            };
          } else {
            edges.push({
              sourceId: parent.id,
              targetId: child.id,
              type: "contains",
            });
          }
        }
      }
    }
  }

  return edges;
}

/**
 * Infer relationships from known type mappings.
 * Matches resources within the same resource group.
 */
function discoverTypeBased(resources: AzureResource[]): ResourceRelationship[] {
  const edges: ResourceRelationship[] = [];
  const byType = new Map<string, AzureResource[]>();

  for (const res of resources) {
    const key = res.type.toLowerCase();
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(res);
  }

  for (const source of resources) {
    const mappings = KNOWN_TYPE_MAP[source.type.toLowerCase()];
    if (!mappings) continue;

    for (const mapping of mappings) {
      const targets = byType.get(mapping.targetType) ?? [];
      for (const target of targets) {
        // Match within same resource group
        if (
          source.resourceGroup.toLowerCase() === target.resourceGroup.toLowerCase()
        ) {
          edges.push({
            sourceId: source.id,
            targetId: target.id,
            type: mapping.relationship,
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Discover all relationships between resources.
 * Pure function — no Azure calls, operates on already-fetched resources.
 */
export function discoverRelationships(resources: AzureResource[]): ResourceRelationship[] {
  const parentChild = discoverParentChild(resources);
  const typeBased = discoverTypeBased(resources);
  return [...parentChild, ...typeBased];
}
