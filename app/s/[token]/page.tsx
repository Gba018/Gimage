import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SharedViewer } from "@/components/shared-viewer";
import { Spinner } from "@/components/ui/input";
import { getDesign, getDesignByShareToken } from "@/lib/server/designs";
import { getCurrentUser } from "@/lib/server/session";
import { getWorkspaceRole } from "@/lib/server/workspaces";

export const metadata: Metadata = { title: "Shared design", robots: { index: false, follow: false } };

export default function SharedPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-brand-600">
          <Spinner size={28} />
        </div>
      }
    >
      <Shared params={params} />
    </Suspense>
  );
}

async function Shared({ params }: { params: PageProps<"/s/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const design = await getDesignByShareToken(token);
  if (!design) notFound();
  const user = await getCurrentUser();
  const isOwner = Boolean(user && await getDesign(user.id, design.id) && (!design.workspaceId || ["admin", "editor"].includes(await getWorkspaceRole(user.id, design.workspaceId) ?? "")));
  // Only expose what a viewer needs: never owner ids or the internal design id.
  return <SharedViewer token={token} title={design.title} doc={design.doc} isOwner={isOwner} authorName={user?.name ?? ""} />;
}
