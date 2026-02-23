import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function AppLayoutContent({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Only redirect to /auth if user is not on the home page
        // This allows users to register from home without being redirected
        const currentPath = window.location.pathname;
        if (currentPath !== '/' && currentPath !== '/tournaments') {
          navigate("/auth");
        }
      }
      // TODO: Add onboarding check when user profile is implemented
    }
  }, [loading, isAuthenticated, navigate]);

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
          {isAuthenticated && <AppSidebar />}
          <main className={`flex-1 flex flex-col min-w-0 ${!isAuthenticated ? 'w-full' : ''}`}>
            <header className="h-12 flex-shrink-0 flex items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm">
              {isMobile && isAuthenticated && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-3"
                  onClick={() => setOpenMobile(true)}
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle Sidebar</span>
                </Button>
              )}
              <div className="ml-auto flex items-center gap-3">
                {isAuthenticated && (
                  <span className="text-xs font-mono px-2 py-1 rounded border border-primary/30 text-primary bg-primary/5">
                    {user?.subscription_plan || 'USER'}
                  </span>
                )}
              </div>
            </header>
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
        <Footer />
      </div>
      
      {/* Mobile Sidebar - only for authenticated users */}
      {isAuthenticated && (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r border-border">
            <MobileSidebar />
          </SheetContent>
        </Sheet>
      )}
    </SidebarProvider>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
