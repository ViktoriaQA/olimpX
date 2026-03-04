import { Trophy, BookOpen, Users, CreditCard, Shield, Settings, LogOut, Terminal, LayoutDashboard, PanelLeft, Menu, Timer, Target, ListTodo, Code, History, Star, User, Award, Lock, TrendingUp } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  requiresPro?: boolean;
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const collapsed = state === "collapsed";

  // Don't render sidebar if user is not authenticated
  if (!user) {
    return null;
  }

  // Check if user is in tournament pages
  const isInTournament = location.pathname.startsWith('/tournaments/') && location.pathname !== '/tournaments';

  const commonItems: MenuItem[] = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('navigation.codeExecution'), url: "/code-execution", icon: Code },
    { title: t('navigation.subscription'), url: "/subscription", icon: CreditCard },
  ];

  const studentItems: MenuItem[] = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('navigation.codeExecution'), url: "/code-execution", icon: Code },
    { title: t('navigation.tournaments'), url: "/my-tournaments", icon: Trophy },
    { title: t('navigation.myProgress'), url: "/progress", icon: TrendingUp },
    { title: t('navigation.rating'), url: "/rating", icon: Star, requiresPro: true },
    { 
      title: t('navigation.certificates'), 
      url: "/certificates", 
      icon: Award,
      requiresPro: true 
    },
    { title: t('navigation.subscription'), url: "/subscription", icon: CreditCard },
  ];

  const trainerItems: MenuItem[] = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('navigation.codeExecution'), url: "/code-execution", icon: Code },
    { title: t('navigation.taskLibrary'), url: "/tasks", icon: BookOpen },
    { title: t('navigation.students'), url: "/students", icon: Users },
    { title: t('tournaments.myTournaments'), url: "/my-tournaments", icon: Trophy },
    { title: t('navigation.myProgress'), url: "/progress", icon: TrendingUp },
    { title: t('navigation.analytics'), url: "/analytics", icon: History },
    { title: t('navigation.subscription'), url: "/subscription", icon: CreditCard },
  ];

  const adminItems: MenuItem[] = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('navigation.codeExecution'), url: "/code-execution", icon: Code },
    { title: t('navigation.taskLibrary'), url: "/tasks", icon: BookOpen },
    { title: t('navigation.students'), url: "/students", icon: Users },
    { title: t('navigation.analytics'), url: "/analytics", icon: History },
    { title: t('tournaments.myTournaments'), url: "/my-tournaments", icon: Trophy },
    { title: t('navigation.admin'), url: "/admin", icon: Shield },
    { title: t('navigation.subscription'), url: "/subscription", icon: CreditCard },
  ];

  const items = user?.role === "admin" ? adminItems : user?.role === "trainer" ? trainerItems : studentItems;

  const handleSignOut = () => {
    logout();
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar hidden md:block">
      <SidebarHeader className="border-b border-border h-12">
        <div className="h-full flex items-center justify-between px-4">
          {!collapsed && (
            <div className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/50 transition-colors rounded-md p-1"
              onClick={() => navigate("/")}
            >
              <Terminal className="w-6 h-6 text-primary shrink-0" />
              <span className="font-mono font-bold text-primary text-lg neon-text">
                CodeArena
              </span>
            </div>
          )}
          <div className={collapsed ? "flex justify-center w-full" : "flex justify-end"}>
            <SidebarTrigger className="text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            {!collapsed && t('navigation.navigationLabel')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isDisabled = item.requiresPro && user?.subscription_plan !== 'Pro';
                return (
                  <SidebarMenuItem key={item.title}>
                    {isDisabled ? (
                      <div className="font-mono text-sm text-muted-foreground cursor-not-allowed opacity-60 transition-colors flex items-center justify-between gap-2 px-2 py-1 rounded-md">
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span>{item.title}</span>
                        </div>
                        <div className="relative group/lock">
                          <Lock className="w-3 h-3 shrink-0 cursor-pointer" />
                          <div className="absolute right-full mr-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover/lock:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {t('navigation.requiresPro')}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end
                          className="font-mono text-sm text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent transition-colors"
                          activeClassName="text-primary bg-sidebar-accent neon-text"
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border border-border">
            <AvatarFallback className="bg-muted text-muted-foreground font-mono text-xs">
              {user?.nickname?.slice(0, 2).toUpperCase() ?? user?.first_name?.slice(0, 2).toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-sidebar-foreground truncate">{user?.nickname || user?.first_name || user?.email || "User"}</p>
              <p className="text-xs font-mono text-muted-foreground">{user?.subscription_plan || user?.role || "student"}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleSignOut} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
