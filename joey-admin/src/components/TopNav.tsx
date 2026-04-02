export function TopNav() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 shadow-sm">
      <div className="flex flex-1 items-center">
        {/* We can put dynamic page titles or breadcrumbs here in the future */}
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-sm font-medium">System Admin</div>
        <div className="h-8 w-8 overflow-hidden rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
          AD
        </div>
      </div>
    </header>
  );
}
