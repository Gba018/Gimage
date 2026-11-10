import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen flex-1 bg-white lg:grid-cols-2">
      <section className="flex flex-col px-6 py-7 sm:px-12 sm:py-9 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 sm:py-14">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-lumio-purple">Your creative space</p>
          <h1 className="text-4xl font-bold tracking-tight text-ink-950 sm:text-[42px]">{title}</h1>
          <p className="mb-8 mt-3 text-base leading-6 text-ink-500">{subtitle}</p>
          {children}
        </div>
        <p className="text-center text-xs text-ink-400 sm:text-left">Create, edit, and share with Gimage.</p>
      </section>
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#00aeb9] via-[#7d2ae8] to-[#d72ba9] lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <div className="absolute -left-20 top-24 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-96 w-96 rounded-full bg-lumio-pink/50 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-12 py-14 xl:px-16">
          <div className="mb-10 max-w-md text-white">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Made for making</p>
            <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">Your next idea starts here.</h2>
            <p className="mt-4 text-base leading-7 text-white/85">Choose a template, make it yours, and share what you create.</p>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-4">
            <div className="aspect-square rounded-2xl bg-[#FFF4E0] p-5 shadow-pop">
              <div className="h-10 w-10 rounded-full bg-[#FFB347]" />
              <p className="mt-6 font-[Bebas_Neue] text-4xl leading-none text-[#1F2A44]">SUMMER SALE</p>
            </div>
            <div className="mt-10 aspect-[3/4] rounded-2xl bg-gradient-to-b from-[#1B1464] to-[#E94E77] p-5 text-white shadow-pop">
              <p className="text-xs tracking-[0.3em] opacity-70">INTRODUCING</p>
              <p className="mt-2 text-3xl font-bold leading-none">Nova App</p>
            </div>
            <div className="-mt-10 aspect-[4/3] rounded-2xl bg-white p-5 shadow-pop">
              <div className="h-2 w-16 rounded bg-brand-500" />
              <div className="mt-3 h-2 w-24 rounded bg-ink-200" />
              <div className="mt-2 h-2 w-20 rounded bg-ink-200" />
            </div>
            <div className="aspect-square rounded-2xl bg-[#14213D] p-5 shadow-pop">
              <div className="mx-auto h-16 w-16 rounded-full border-8 border-[#FCA311]" />
              <p className="mt-4 text-center text-sm font-bold tracking-widest text-white">JAZZ NIGHT</p>
            </div>
          </div>
        </div>
        <p className="relative px-12 pb-9 text-sm font-medium text-white/70 xl:px-16">Design on your terms with Gimage.</p>
      </aside>
    </main>
  );
}
