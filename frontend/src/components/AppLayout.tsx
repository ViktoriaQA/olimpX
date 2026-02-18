import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/components/Footer";

export function AppLayout({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!session) navigate("/auth");
      else if (profile && !profile.onboarded) navigate("/onboarding");
    }
  }, [loading, session, profile, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background matrix-bg">
        <div className="animate-pulse-glow text-primary font-mono text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background matrix-bg">
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0">
            <header className="h-12 flex-shrink-0 flex items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm">
              <SidebarTrigger className="text-muted-foreground hover:text-primary" />
              <div className="ml-auto flex items-center gap-3">
                <span className={`text-xs font-mono px-2 py-1 rounded border ${
                  profile?.subscription_status === "active"
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-destructive/30 text-destructive bg-destructive/5"
                }`}>
                  {profile?.subscription_status === "active" ? "PRO" : "FREE"}
                </span>
              </div>
            </header>
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </SidebarProvider>
  );
}
