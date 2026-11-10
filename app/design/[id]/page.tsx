import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditorLoader } from "@/components/editor/editor-loader";
import { Spinner } from "@/components/ui/input";
import { getDesign } from "@/lib/server/designs";
import { requirePageUser } from "@/lib/server/session";
import { getWorkspaceRole } from "@/lib/server/workspaces";
import { DesignPreview } from "@/components/design-preview";
import Link from "next/link";

export const metadata: Metadata = { title: "Editor" };

export default function DesignPage({ params }: PageProps<"/design/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-ink-100 text-brand-600">
          <Spinner size={28} />
        </div>
      }
    >
      <DesignEditor params={params} />
    </Suspense>
  );
}

async function DesignEditor({ params }: { params: PageProps<"/design/[id]">["params"] }) {
  const { id } = await params;
  const user = await requirePageUser(`/design/${id}`);
  const design = await getDesign(user.id, id);
  if (!design) notFound();
  if (design.workspaceId && await getWorkspaceRole(user.id, design.workspaceId) === "viewer") {
    return <main className="min-h-screen bg-ink-100 px-4 py-8"><div className="mx-auto max-w-4xl"><div className="mb-6 flex items-center justify-between gap-4"><h1 className="text-xl font-semibold">{design.title}</h1><Link href="/dashboard" className="text-sm text-brand-600">Back to dashboard</Link></div><p className="mb-6 text-sm text-ink-500">View only · Ask a workspace admin for editor access to make changes.</p><div className="space-y-8">{design.doc.pages.map((page, index) => <figure key={page.id}><DesignPreview page={page} width={design.doc.width} height={design.doc.height} alt={`${design.title}, page ${index + 1}`} className="mx-auto max-h-[85vh] rounded-lg bg-white shadow-panel" /></figure>)}</div></div></main>;
  }
  return <EditorLoader design={{ id: design.id, title: design.title, doc: design.doc, shareToken: design.shareToken, revision: design.revision }} />;
}
