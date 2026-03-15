import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ua' : 'en';
    console.log('Switching language from', i18n.language, 'to', newLang);
    i18n.changeLanguage(newLang);
  };

  const currentLanguage = i18n.language === 'en' ? 'UK' : 'UA';
  
  const FlagIcon = () => {
    if (i18n.language === 'en') {
      return (
        <svg width="20" height="15" viewBox="0 0 20 15" className="rounded-sm">
          <rect width="20" height="15" fill="#012169"/>
          <path d="M0 0h20v15H0z" fill="none" stroke="white" strokeWidth="2"/>
          <path d="M0 0l20 15M20 0L0 15" stroke="white" strokeWidth="2"/>
          <path d="M0 0l20 15M20 0L0 15" stroke="#C8102E" strokeWidth="1.3"/>
          <path d="M10 0v15M0 7.5h20" stroke="white" strokeWidth="3"/>
          <path d="M10 0v15M0 7.5h20" stroke="#C8102E" strokeWidth="2"/>
        </svg>
      );
    } else {
      return (
        <svg width="20" height="15" viewBox="0 0 20 15" className="rounded-sm">
          <rect width="20" height="7.5" fill="#005BBB"/>
          <rect y="7.5" width="20" height="7.5" fill="#FFD500"/>
        </svg>
      );
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 text-sm hover:text-primary hover:bg-primary/10 transition-colors"
    >
      <FlagIcon />
      <span className="hidden md:inline">{currentLanguage}</span>
    </Button>
  );
}
