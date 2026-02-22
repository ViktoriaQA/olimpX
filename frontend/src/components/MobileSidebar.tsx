import { Trophy, BookOpen, Users, CreditCard, Shield, Settings, LogOut, Terminal } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard } from "lucide-react";

export function MobileSidebar() {
  const { user, logout } = useAuth();
  const { openMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const commonItems = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('navigation.tournaments'), url: "/tournaments", icon: Trophy },
    { title: t('navigation.subscription'), url: "/subscription", icon: CreditCard },
  ];

  const studentItems = [
    ...commonItems,
    { title: t('navigation.myProgress'), url: "/progress", icon: BookOpen },
  ];

  const trainerItems = [
    ...commonItems,
    { title: t('navigation.taskLibrary'), url: "/tasks", icon: BookOpen },
    { title: t('navigation.students'), url: "/students", icon: Users },
  ];

  const adminItems = [
    ...trainerItems,
    { title: t('navigation.admin'), url: "/admin", icon: Shield },
  ];

  const items = user?.role === "admin" ? adminItems : user?.role === "trainer" ? trainerItems : studentItems;

  const handleSignOut = () => {
    logout();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border h-12 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/50 transition-colors rounded-md p-1"
          onClick={() => navigate("/")}
        >
          <Terminal className="w-6 h-6 text-primary shrink-0" />
          <span className="font-mono font-bold text-primary text-lg neon-text">
            CodeArena
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
            {t('navigation.navigationLabel')}
          </h3>
          <div className="space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                end
                className="flex items-center gap-3 rounded-md p-2 text-sm font-mono text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent transition-colors"
                activeClassName="text-primary bg-sidebar-accent neon-text"
                onClick={() => setOpenMobile(false)}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border border-border">
            <AvatarFallback className="bg-muted text-muted-foreground font-mono text-xs">
              {user?.nickname?.slice(0, 2).toUpperCase() ?? user?.first_name?.slice(0, 2).toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-sidebar-foreground truncate">{user?.nickname || user?.first_name || user?.email || "User"}</p>
            <p className="text-xs font-mono text-muted-foreground">{user?.subscription_plan || user?.role || "student"}</p>
          </div>
          <button onClick={handleSignOut} className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
