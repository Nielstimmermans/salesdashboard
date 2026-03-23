import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function TVLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/tv");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
    </div>
  );
}
