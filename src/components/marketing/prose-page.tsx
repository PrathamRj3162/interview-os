import { SiteHeader, SiteFooter } from "./site-header";

export function ProsePage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-7 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-text/90">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
