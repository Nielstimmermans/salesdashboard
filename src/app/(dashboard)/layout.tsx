import { Show, UserButton, SignInButton } from "@clerk/nextjs";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Show when="signed-in">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b bg-white px-6">
            <h1 className="text-lg font-semibold text-gray-900">
              Sales Dashboard
            </h1>
            <UserButton showName />
          </header>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-gray-500">Log in om verder te gaan</p>
            <SignInButton mode="modal">
              <button className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90">
                Inloggen
              </button>
            </SignInButton>
          </div>
        </div>
      </Show>
    </div>
  );
}
