import type { AzureResource } from "@/types/azure";
import { discoverRelationships } from "@/services/azure/relationships";

// ── Helpers ──────────────────────────────────────────────
function makeResource(overrides: Partial<AzureResource> & { id: string }): AzureResource {
  return {
    name: overrides.id.split("/").pop() ?? "unknown",
    type: "Microsoft.Unknown/type",
    resourceGroup: "rg-1",
    location: "eastus",
    ...overrides,
  };
}

const SUB = "/subscriptions/sub-1/resourceGroups/rg-1/providers";

// ── Tests ────────────────────────────────────────────────
describe("discoverRelationships", () => {
  it("returns empty array for empty resource list", () => {
    const result = discoverRelationships([]);
    expect(result).toEqual([]);
  });

  it("detects parent/child from VNet→Subnet ID containment", () => {
    const vnet = makeResource({
      id: `${SUB}/Microsoft.Network/virtualNetworks/myVNet`,
      type: "Microsoft.Network/virtualNetworks",
    });
    const subnet = makeResource({
      id: `${SUB}/Microsoft.Network/virtualNetworks/myVNet/subnets/default`,
      type: "Microsoft.Network/virtualNetworks/subnets",
    });

    const edges = discoverRelationships([vnet, subnet]);

    expect(edges).toContainEqual({
      sourceId: vnet.id,
      targetId: subnet.id,
      type: "contains",
    });
  });

  it("finds VM→NIC 'uses' relationship in same resource group", () => {
    const vm = makeResource({
      id: `${SUB}/Microsoft.Compute/virtualMachines/myVM`,
      type: "Microsoft.Compute/virtualMachines",
      resourceGroup: "rg-1",
    });
    const nic = makeResource({
      id: `${SUB}/Microsoft.Network/networkInterfaces/myVM-nic`,
      type: "Microsoft.Network/networkInterfaces",
      resourceGroup: "rg-1",
    });

    const edges = discoverRelationships([vm, nic]);

    expect(edges).toContainEqual({
      sourceId: vm.id,
      targetId: nic.id,
      type: "uses",
    });
  });

  it("finds NIC→Subnet 'attachedTo' relationship", () => {
    const nic = makeResource({
      id: `${SUB}/Microsoft.Network/networkInterfaces/myNIC`,
      type: "Microsoft.Network/networkInterfaces",
      resourceGroup: "rg-1",
    });
    const subnet = makeResource({
      id: `${SUB}/Microsoft.Network/virtualNetworks/myVNet/subnets/default`,
      type: "Microsoft.Network/virtualNetworks/subnets",
      resourceGroup: "rg-1",
    });

    const edges = discoverRelationships([nic, subnet]);

    expect(edges).toContainEqual({
      sourceId: nic.id,
      targetId: subnet.id,
      type: "attachedTo",
    });
  });

  it("finds WebApp→AppServicePlan 'hostedOn' relationship", () => {
    const webapp = makeResource({
      id: `${SUB}/Microsoft.Web/sites/myApp`,
      type: "Microsoft.Web/sites",
      resourceGroup: "rg-1",
    });
    const plan = makeResource({
      id: `${SUB}/Microsoft.Web/serverfarms/myPlan`,
      type: "Microsoft.Web/serverfarms",
      resourceGroup: "rg-1",
    });

    const edges = discoverRelationships([webapp, plan]);

    expect(edges).toContainEqual({
      sourceId: webapp.id,
      targetId: plan.id,
      type: "hostedOn",
    });
  });

  it("returns no relationships for unrelated resource types", () => {
    const storage = makeResource({
      id: `${SUB}/Microsoft.Storage/storageAccounts/sa1`,
      type: "Microsoft.Storage/storageAccounts",
      resourceGroup: "rg-1",
    });
    const cosmos = makeResource({
      id: `${SUB}/Microsoft.DocumentDB/databaseAccounts/cosmos1`,
      type: "Microsoft.DocumentDB/databaseAccounts",
      resourceGroup: "rg-1",
    });

    const edges = discoverRelationships([storage, cosmos]);

    expect(edges).toEqual([]);
  });

  it("does not match type-based relationships across different resource groups", () => {
    const vm = makeResource({
      id: `${SUB}/Microsoft.Compute/virtualMachines/myVM`,
      type: "Microsoft.Compute/virtualMachines",
      resourceGroup: "rg-alpha",
    });
    const nic = makeResource({
      id: `/subscriptions/sub-1/resourceGroups/rg-beta/providers/Microsoft.Network/networkInterfaces/otherNIC`,
      type: "Microsoft.Network/networkInterfaces",
      resourceGroup: "rg-beta",
    });

    const edges = discoverRelationships([vm, nic]);

    expect(edges).toEqual([]);
  });

  it("handles resources with malformed IDs without crashing", () => {
    const broken = makeResource({
      id: "",
      type: "Microsoft.Compute/virtualMachines",
      resourceGroup: "unknown",
    });
    const normal = makeResource({
      id: `${SUB}/Microsoft.Storage/storageAccounts/sa1`,
      type: "Microsoft.Storage/storageAccounts",
    });

    expect(() => discoverRelationships([broken, normal])).not.toThrow();
  });
});
