import type { Metadata } from "next";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Spinner } from "@/components/ui/input";
import { requirePageUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Home" };

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-brand-600">
          <Spinner size={28} />
        </div>
      }
    >
      <DashboardForUser />
    </Suspense>
  );
}

async function DashboardForUser() {
  const user = await requirePageUser("/dashboard");
  return <Dashboard user={user} />;
}
