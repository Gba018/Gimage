"use client";

import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Share2,
  MessageSquare,
  Palette,
  FolderTree,
  MousePointer,
  ArrowRight,
} from "lucide-react";

export function LumioCollaboration() {
  return (
    <section id="collaboration" className="scroll-mt-24 py-20 lg:py-28 bg-gradient-to-b from-white via-ink-50/50 to-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy & Benefits */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-lumio-purple-light px-3.5 py-1 text-xs font-bold text-lumio-purple">
              <Users className="h-3.5 w-3.5" />
              <span>Team Collaboration</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink-950 leading-tight">
              Design together,{" "}
              <span className="lumio-gradient-text">no matter where you are</span>
            </h2>

            <p className="text-base sm:text-lg text-ink-600 leading-relaxed">
              Work with your team in a shared workspace. See who is editing, review saved changes within seconds, and leave feedback on shared designs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lumio-purple-light text-lumio-purple">
                  <Palette className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink-900">Brand Kit Consistency</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Save your colors, font, and logo in a personal Brand Kit for reuse.
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lumio-teal-light text-lumio-teal-dark">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink-900">Comments & Approvals</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Leave page-specific feedback on a shared design link.
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                  <Share2 className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink-900">Instant View Links</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Send view-only links to clients or stakeholders. Revoke access with one click.
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FolderTree className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink-900">Team Workspaces</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Keep team designs together with editor and viewer roles.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="lumio-gradient-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-md"
              >
                <span>Create a free team workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Collaboration Canvas Mockup */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto rounded-3xl border border-ink-200/80 bg-white p-5 sm:p-7 shadow-2xl">
              {/* Fake Canvas Toolbar */}
              <div className="flex items-center justify-between border-b border-ink-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-semibold text-ink-600">Product Launch Deck 2026</span>
                </div>
                {/* Active user avatars */}
                <div className="flex items-center -space-x-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lumio-purple text-[10px] font-bold text-white ring-2 ring-white">
                    AK
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lumio-teal-dark text-[10px] font-bold text-white ring-2 ring-white">
                    PR
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lumio-pink text-[10px] font-bold text-white ring-2 ring-white">
                    SJ
                  </div>
                  <span className="ml-2 text-xs font-bold text-ink-400">+4</span>
                </div>
              </div>

              {/* Canvas interior preview */}
              <div className="relative mt-5 aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-tr from-lumio-teal-light via-white to-lumio-purple-light p-6 shadow-inner border border-ink-100">
                {/* Sample visual slide content */}
                <div className="max-w-xs space-y-2">
                  <span className="rounded bg-lumio-purple/15 px-2 py-0.5 text-[10px] font-bold text-lumio-purple uppercase">
                    Q3 Campaign
                  </span>
                  <h4 className="text-xl font-extrabold text-ink-950">
                    Grow faster with unified brand assets
                  </h4>
                  <p className="text-xs text-ink-500">
                    Approved color gradients and typography guidelines for social media teams.
                  </p>
                </div>

                {/* Simulated Live Cursor 1 */}
                <div className="absolute top-1/3 right-1/4 animate-float-subtle">
                  <div className="flex items-center gap-1.5">
                    <MousePointer className="h-4 w-4 fill-lumio-purple text-lumio-purple drop-shadow" />
                    <span className="rounded-md bg-lumio-purple px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                      Priya: editing headline
                    </span>
                  </div>
                </div>

                {/* Simulated Live Cursor 2 */}
                <div className="absolute bottom-10 left-1/3">
                  <div className="flex items-center gap-1.5">
                    <MousePointer className="h-4 w-4 fill-lumio-teal-dark text-lumio-teal-dark drop-shadow" />
                    <span className="rounded-md bg-lumio-teal-dark px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                      Alex: adding chart
                    </span>
                  </div>
                </div>

                {/* Simulated Comment Card */}
                <div className="absolute bottom-4 right-4 rounded-xl border border-ink-100 bg-white/95 p-3 shadow-lg backdrop-blur-sm max-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-ink-800">Sarah M.</span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-600">
                    &quot;Love this gradient! Let&apos;s push to marketing.&quot;
                  </p>
                </div>
              </div>

              {/* Bottom status badge */}
              <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Changes saved automatically</span>
                </span>
                <span>Version history available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
