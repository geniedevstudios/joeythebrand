import { AppPagesTabs } from "@/components/AppPagesTabs";

export default function AppPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-none">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1c1e22]/45">
          The storefront
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1c1e22] sm:text-3xl">
          App pages
        </h1>
        <p className="mt-1 text-sm text-[#1c1e22]/60">
          Heroes, films, and copy — grouped by page.
        </p>
      </div>
      <AppPagesTabs />
      {children}
    </div>
  );
}
