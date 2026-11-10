"use client";

import { Copy, MessageSquare, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { DesignDoc } from "@/lib/design/types";
import type { DesignComment } from "@/lib/server/comments";
import { DesignPreview } from "@/components/design-preview";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

export function SharedViewer({ token, title, doc, isOwner, authorName }: { token: string; title: string; doc: DesignDoc; isOwner: boolean; authorName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [commentName, setCommentName] = useState(authorName);
  const [commentBody, setCommentBody] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    api<{ comments: DesignComment[] }>(`/api/shared/${token}/comments`)
      .then((result) => { if (mounted) setComments(result.comments); })
      .catch((err: Error) => { if (mounted) setError(err.message); });
    return () => { mounted = false; };
  }, [token]);

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCommentBusy(true);
    setError(null);
    try {
      const result = await api<{ comment: DesignComment }>(`/api/shared/${token}/comments`, {
        method: "POST", json: { authorName: commentName, body: commentBody, pageIndex },
      });
      setComments((current) => [...current, result.comment]);
      setCommentBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment");
    } finally {
      setCommentBusy(false);
    }
  }

  async function removeComment(id: string) {
    setError(null);
    try {
      await api(`/api/comments/${id}`, { method: "DELETE" });
      setComments((current) => current.filter((comment) => comment.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete comment");
    }
  }

  async function copy() {
    setBusy(true);
    setError(null);
    try {
      const { design } = await api<{ design: { id: string } }>(`/api/shared/${token}/copy`, { method: "POST" });
      router.push(`/design/${design.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/s/${token}`)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not copy design");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-ink-700">{title}</h1>
          <Button onClick={copy} disabled={busy}>
            {busy ? <Spinner /> : <Copy size={16} />} Make a copy
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger-600">
            {error}
          </p>
        )}
        {doc.pages.map((page, i) => (
          <figure key={page.id} className="mx-auto" style={{ maxWidth: `calc(80vh * ${doc.width / doc.height})` }}>
            <DesignPreview
              page={page}
              width={doc.width}
              height={doc.height}
              maxSize={1600}
              alt={`${title}, page ${i + 1} of ${doc.pages.length}`}
              className="rounded-lg bg-white shadow-panel ring-1 ring-ink-100"
            />
            {doc.pages.length > 1 && <figcaption className="mt-2 text-center text-xs text-ink-500">Page {i + 1}</figcaption>}
          </figure>
        ))}
        <section aria-labelledby="comments-heading" className="mx-auto max-w-2xl border-t border-ink-100 pt-8">
          <h2 id="comments-heading" className="flex items-center gap-2 text-lg font-semibold text-ink-900"><MessageSquare size={20} /> Comments</h2>
          <p className="mt-1 text-sm text-ink-500">Leave feedback on a specific page of this shared design.</p>
          <form onSubmit={submitComment} className="mt-5 space-y-3">
            <label className="block text-sm text-ink-700">Your name
              <input required maxLength={60} value={commentName} onChange={(event) => setCommentName(event.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2" />
            </label>
            {doc.pages.length > 1 && <label className="block text-sm text-ink-700">Page
              <select value={pageIndex} onChange={(event) => setPageIndex(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2">
                {doc.pages.map((page, index) => <option key={page.id} value={index}>Page {index + 1}</option>)}
              </select>
            </label>}
            <label className="block text-sm text-ink-700">Comment
              <textarea required maxLength={2000} rows={3} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2" />
            </label>
            <Button type="submit" disabled={commentBusy}>{commentBusy ? <Spinner /> : "Post comment"}</Button>
          </form>
          <div className="mt-8 space-y-4" aria-live="polite">
            {comments.length === 0 && <p className="text-sm text-ink-500">No comments yet.</p>}
            {comments.map((comment) => <article key={comment.id} className="rounded-xl border border-ink-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-ink-900">{comment.authorName} <span className="font-normal text-ink-500">· Page {comment.pageIndex + 1}</span></p>
                {isOwner && <button type="button" onClick={() => removeComment(comment.id)} aria-label={`Delete comment by ${comment.authorName}`} className="text-ink-500 hover:text-danger-600"><Trash2 size={16} /></button>}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-700">{comment.body}</p>
            </article>)}
          </div>
        </section>
      </main>
    </div>
  );
}
