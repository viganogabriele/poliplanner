import AppNav from "@/components/layout/ClientAppNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppNav />
      <main className="min-w-0 flex-1 pt-16 pb-24 lg:pt-0 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
