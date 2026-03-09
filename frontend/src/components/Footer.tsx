import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface FooterProps {
  showLanguageSwitcher?: boolean;
  customContent?: React.ReactNode;
}

export function Footer({ 
  showLanguageSwitcher = true,
  customContent 
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
      isSidebarCollapsed ? 'md:left-12' : 'md:left-64'
    }`}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex-1" />
          <div className="flex items-center justify-center">
            {customContent || (
              <span>{t('footer.copyright', { year: currentYear })}</span>
            )}
          </div>
          <div className="flex-1 flex justify-end">
            {showLanguageSwitcher && <LanguageSwitcher />}
          </div>
        </div>
      </div>
    </footer>
  );
}
