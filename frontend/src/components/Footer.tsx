import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Mail, Clock } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

interface FooterProps {
  showLanguageSwitcher?: boolean;
  customContent?: React.ReactNode;
  hasSidebar?: boolean;
}

export function Footer({ 
  showLanguageSwitcher = true,
  customContent,
  hasSidebar = true
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();
  
  // Try to use sidebar context, but provide fallback if not available
  let isSidebarCollapsed = false;
  try {
    const { state } = useSidebar();
    isSidebarCollapsed = state === "collapsed";
  } catch (error) {
    // Footer is used outside SidebarProvider, use default value
    isSidebarCollapsed = false;
  }
  
  return (
    <footer className={`fixed bottom-0 left-0 right-0 border-t border-border bg-card/30 backdrop-blur-lg py-1 px-6 z-50 transition-all duration-300 ${
      hasSidebar ? (isSidebarCollapsed ? 'md:left-12' : 'md:left-64') : ''
    }`}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex-1 flex justify-start">
            <span className="hidden md:inline">{t('footer.copyright', { year: currentYear })}</span>
            <span className="md:hidden">© 2026 Xcode</span>
          </div>
          <div className="hidden md:flex items-center justify-center gap-4">
            {customContent || (
              <>
                <a 
                  href="mailto:support@xcode24.com" 
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Mail className="h-4 w-4" />
                  support@xcode24.com
                </a>
                <span className="text-muted-foreground/50">|</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Пн-Пт: 9:00-18:00
                </span> 
              </>
            )}
          </div>
          <div className="flex-1 flex justify-end items-center gap-4">
            <Link 
              to="/contract" 
              className="hidden md:inline hover:text-primary transition-colors"
            >
              {t('footer.contract', 'Договір оферти')}
            </Link>
            <span className="hidden md:inline">|</span>
            <ThemeToggle />
            <span className="hidden md:inline">|</span>
            {showLanguageSwitcher && <LanguageSwitcher />}
          </div>
        </div>
      </div>
    </footer>
  );
}
