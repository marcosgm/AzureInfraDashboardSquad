"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const TYPE_ICONS: Record<string, string> = {
  "microsoft.compute/virtualmachines": "🖥️",
  "microsoft.network/virtualnetworks": "🌐",
  "microsoft.network/networkinterfaces": "🔌",
  "microsoft.network/networksecuritygroups": "🛡️",
  "microsoft.network/publicipaddresses": "📡",
  "microsoft.storage/storageaccounts": "💾",
  "microsoft.web/sites": "🌍",
  "microsoft.web/serverfarms": "📦",
  "microsoft.sql/servers": "🗄️",
  "microsoft.sql/servers/databases": "📊",
  "microsoft.containerservice/managedclusters": "⚙️",
  "microsoft.keyvault/vaults": "🔑",
};

function getTypeIcon(type: string): string {
  return TYPE_ICONS[type.toLowerCase()] ?? "☁️";
}

function getShortType(type: string): string {
  const parts = type.split("/");
  return parts[parts.length - 1] ?? type;
}

interface ResourceNodeData {
  label: string;
  resourceType: string;
  resourceGroup: string;
  [key: string]: unknown;
}

function ResourceNode({ data }: NodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const nodeData = data as unknown as ResourceNodeData;

  return (
    <div
      className="relative rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 shadow-lg transition-shadow hover:shadow-xl"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />

      <div className="flex items-center gap-2">
        <span className="text-lg">{getTypeIcon(nodeData.resourceType)}</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-100">
            {nodeData.label}
          </div>
          <div className="truncate text-xs text-slate-400">
            {getShortType(nodeData.resourceType)}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />

      {showTooltip && (
        <div className="absolute -top-10 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-slate-950 px-3 py-1.5 text-xs text-slate-200 shadow-lg">
          Resource Group: {nodeData.resourceGroup}
        </div>
      )}
    </div>
  );
}

export default memo(ResourceNode);
