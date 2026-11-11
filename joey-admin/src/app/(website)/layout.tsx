import { WebsiteTabs } from "@/components/WebsiteTabs";

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-none">
      <WebsiteTabs />
      {children}
    </div>
  );
}
