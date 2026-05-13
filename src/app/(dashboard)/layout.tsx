"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(var(--app-bg))]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--app-bg))]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-8 space-y-6">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
