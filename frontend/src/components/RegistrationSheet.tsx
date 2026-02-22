import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mail, Lock, GraduationCap, User, Eye, EyeOff } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthButtons } from "@/components/AuthButtons";

interface RegistrationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string, password: string, firstName: string, lastName: string, isTrainer: boolean) => Promise<void>;
  onGoogleAuth: () => Promise<void>;
  onDiscordAuth: () => Promise<void>;
  isLoading?: boolean;
}

export function RegistrationSheet({ 
  open, 
  onOpenChange, 
  onSubmit, 
  onGoogleAuth, 
  onDiscordAuth,
  isLoading = false 
}: RegistrationSheetProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);

  const sheetSide = isMobile ? "bottom" : "left";
  const sheetClassName = isMobile 
    ? "h-[85vh] rounded-t-2xl" 
    : "w-[400px] overflow-y-auto p-6";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName) return;
    await onSubmit(email, password, firstName, lastName, isTrainer);
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

          {/* First Name field */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="font-mono text-sm">
              <span className="text-primary">$</span> {t('auth.firstName') || 'First Name'}
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                type="text"
                placeholder="Enter your first name"
                className="pl-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Last Name field */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="font-mono text-sm">
              <span className="text-primary">$</span> {t('auth.lastName') || 'Last Name'}
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                className="pl-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono text-sm">
              <span className="text-primary">$</span> {t('auth.email')}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                className="pl-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="font-mono text-sm">
              <span className="text-primary">$</span> {t('auth.password')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t('auth.passwordPlaceholder')}
                className="pl-10 pr-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <form onSubmit={handleSubmit}>
            <Button
              type="submit"
              className="w-full h-11 font-mono text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Registering...' : 'Register'}
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

          <AuthButtons
            onGoogleAuth={onGoogleAuth}
            onDiscordAuth={onDiscordAuth}
            isLoading={isLoading}
            variant="register"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
