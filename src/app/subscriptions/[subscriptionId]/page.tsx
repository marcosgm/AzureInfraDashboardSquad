import Link from "next/link";
import ResourceDiagram from "@/components/ResourceDiagram";

interface PageProps {
  params: Promise<{ subscriptionId: string }>;
}

export default async function SubscriptionPage({ params }: PageProps) {
  const { subscriptionId } = await params;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Subscriptions
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">
          Resource Diagram
        </h2>
        <p className="text-sm text-slate-500">
          Subscription: <span className="font-mono">{subscriptionId}</span>
        </p>
      </div>

      <ResourceDiagram subscriptionId={subscriptionId} />
    </main>
  );
}
