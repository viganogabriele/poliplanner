import AppNav from "@/components/layout/ClientAppNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppNav />
      <main className="min-w-0 flex-1 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-14 lg:pb-0 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
