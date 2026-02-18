import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mail, Lock, GraduationCap, User, Eye, EyeOff } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface RegistrationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string, password: string, isTrainer: boolean) => Promise<void>;
  onGoogleAuth: () => Promise<void>;
  isLoading?: boolean;
}

export function RegistrationSheet({ 
  open, 
  onOpenChange, 
  onSubmit, 
  onGoogleAuth, 
  isLoading = false 
}: RegistrationSheetProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);

  const sheetSide = isMobile ? "bottom" : "left";
  const sheetClassName = isMobile 
    ? "h-[85vh] rounded-t-2xl" 
    : "w-[400px] overflow-y-auto p-6";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await onSubmit(email, password, isTrainer);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={sheetSide} className={sheetClassName}>
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="text-xl font-bold">
            {t('auth.register')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Role Selector */}
          <div className="space-y-2">
            <Label className="block text-sm font-mono text-muted-foreground mb-2">
              <span className="text-primary">$</span> {t('auth.selectRole')}
            </Label>
            <div className="flex items-center justify-between p-0.5 bg-muted/30 rounded-lg border border-border h-9">
              <button
                type="button"
                onClick={() => setIsTrainer(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${
                  !isTrainer ? 'bg-green-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{t('auth.student')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTrainer(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${
                  isTrainer ? 'bg-green-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>{t('auth.trainer')}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-email" className="font-mono text-sm">
                <span className="text-primary">$</span> {t('auth.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  className="pl-10 font-mono text-sm h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password" className="font-mono text-sm">
                <span className="text-primary">$</span> {t('auth.password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="pl-10 pr-10 font-mono text-sm h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-mono text-sm"
              disabled={isLoading}
            >
              {isLoading ? t('auth.registering') : t('auth.register')}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-mono">{t('auth.continueWith')}</span>
            </div>
          </div>

          <Button
            onClick={onGoogleAuth}
            className="w-full h-11 font-mono text-sm bg-transparent border border-border text-foreground hover:bg-accent/50 transition-colors"
            variant="outline"
            disabled={isLoading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
