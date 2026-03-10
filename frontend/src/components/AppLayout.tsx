import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Menu, LogOut, Terminal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function AppLayoutContent({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();

  const handleSignOut = () => {
    logout();
  };

  useEffect(() => {
    console.log('Sheet state changed:', openMobile);
  }, [openMobile]);

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
    return <Loading />;
  }

  return (
    <>
      <div className="min-h-screen flex flex-col w-full bg-background matrix-bg">
        <div className="flex flex-1">
          {isAuthenticated && !isMobile && <AppSidebar />}
          <main className={`flex-1 flex flex-col min-w-0 ${!isAuthenticated ? 'w-full' : ''}`}>
            <header className="h-12 flex-shrink-0 flex items-center border-b border-border px-4 bg-card/30 backdrop-blur-lg sticky top-0 z-10">
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
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          onClick={() => navigate("/subscription")}
                          className={`text-xs font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                            user?.subscription_plan 
                              ? 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10' 
                              : 'border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/10'
                          }`}
                        >
                          {user?.subscription_plan || 'FREE'}
                        </div>
                      </TooltipTrigger>
                      {!user?.subscription_plan ? (
                        <TooltipContent className="bg-popover border-border text-popover-foreground font-mono text-xs">
                          <p>Обмежений доступ</p>
                        </TooltipContent>
                      ) : (
                        <TooltipContent className="bg-popover border-border text-popover-foreground font-mono text-xs">
                          <p>Дійсний до {user?.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString('uk-UA') : 'невідомо'}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      onClick={handleSignOut}
                      title="Вийти"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </header>
            <div className="flex-1 overflow-auto pb-16">
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
    </>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </SidebarProvider>
    </TooltipProvider>
  );
}
