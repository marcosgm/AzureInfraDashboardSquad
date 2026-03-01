"use client";

import { useState } from "react";
import type { AzureSubscription } from "@/types/azure";

interface SubscriptionListProps {
  subscriptions: AzureSubscription[];
}

function stateStyle(state: string) {
  switch (state) {
    case "Enabled":
      return { badge: "bg-emerald-100 text-emerald-800", row: "bg-white" };
    case "Warned":
      return { badge: "bg-amber-100 text-amber-800", row: "bg-amber-50/40" };
    case "Disabled":
      return { badge: "bg-red-100 text-red-700", row: "bg-red-50/30" };
    default:
      return { badge: "bg-slate-100 text-slate-700", row: "bg-slate-50/30" };
  }
}

export default function SubscriptionList({ subscriptions }: SubscriptionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-medium text-amber-800">No subscriptions found</p>
        <p className="mt-1 text-sm text-amber-600">
          Verify your Azure credentials are configured correctly.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subscription ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                State
              </th>
              <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 lg:table-cell">
                Tenant ID
              </th>
              {/* Expand toggle column */}
              <th className="w-10 px-3 py-3 lg:hidden" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((sub) => {
              const style = stateStyle(sub.state);
              const isExpanded = expandedId === sub.subscriptionId;
              return (
                <tr
                  key={sub.subscriptionId}
                  className={`${style.row} transition-colors hover:bg-slate-50`}
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    {sub.displayName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-500">
                    {sub.subscriptionId}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${style.badge}`}
                    >
                      {sub.state}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-400 lg:table-cell">
                    {sub.tenantId}
                  </td>
                  {/* Mobile expand button */}
                  <td className="px-3 py-4 lg:hidden">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : sub.subscriptionId)
                      }
                      className="text-slate-400 hover:text-slate-600"
                      aria-label="Toggle details"
                    >
                      <svg
                        className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </td>
                  {/* Expanded detail row on mobile — rendered via CSS trick in same <tr> using a colspan trick isn't valid, 
                       so we use a separate mechanism below */}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile detail panel */}
      {expandedId && (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm lg:hidden">
          <p className="text-slate-500">
            <span className="font-medium text-slate-700">Tenant ID: </span>
            <span className="font-mono">
              {subscriptions.find((s) => s.subscriptionId === expandedId)?.tenantId}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
