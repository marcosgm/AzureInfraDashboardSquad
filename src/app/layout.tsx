import type { Metadata } from "next";
import DashboardHeader from "@/components/DashboardHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Azure Infrastructure Visualizer",
  description: "Real-time Azure infrastructure dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <DashboardHeader />
        {children}
      </body>
    </html>
  );
}
