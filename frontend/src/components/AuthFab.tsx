import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, UserPlus, Plus, X, Mail, Lock, GraduationCap, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AuthFabProps {
  isMobile: boolean;
}

export function AuthFab({ isMobile }: AuthFabProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showRegisterSheet, setShowRegisterSheet] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isTrainer, setIsTrainer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast, signInWithGoogle } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: t('common.error'),
        description: t('auth.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement email/password auth
      console.log("Signing in with:", { email });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t('common.success'),
        description: t('auth.checkEmailForLogin'),
      });
      navigate("/auth");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: t('common.error'),
        description: t('auth.loginFailed'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: t('common.error'),
        description: t('auth.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement email/password registration
      console.log("Registering with:", { email, role: isTrainer ? 'trainer' : 'student' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t('common.success'),
        description: t('auth.checkEmailForRegistration'),
      });
      navigate("/auth");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: t('common.error'),
        description: t('auth.registrationFailed'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
      setShowRegisterSheet(false);
    } catch (error) {
      console.error("Google auth error:", error);
    }
  };

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-16 right-6 z-50 flex flex-col gap-2 items-center">
      {/* Expanded menu items */}
      {isExpanded && (
        <div className="flex flex-col gap-2 items-end animate-in slide-in-from-bottom-3 duration-200">
          <Button
            variant="default"
            size="sm"
            className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-center"
            onClick={() => {
              setShowEmailForm(true);
              setIsExpanded(false);
            }}
            title={t('auth.login')}
          >
            <LogIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 rounded-full shadow-lg border-primary/20 hover:bg-primary/5 bg-background flex items-center justify-center"
            onClick={() => {
              setShowRegisterSheet(true);
              setIsExpanded(false);
            }}
            title={t('auth.register')}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* FAB button */}
      <Button
        size="sm"
        className={`h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-background flex items-center justify-center transition-all duration-200 ${
          isExpanded ? "rotate-45" : ""
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>

      {/* Email Form Overlay */}
      {showEmailForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-bold text-primary">{t('auth.login')}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowEmailForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fab-email" className="font-mono text-sm">
                  <span className="text-primary">$</span> {t('auth.email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fab-email"
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
                <Label htmlFor="fab-password" className="font-mono text-sm">
                  <span className="text-primary">$</span> {t('auth.password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fab-password"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder')}
                    className="pl-10 font-mono text-sm h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-mono text-sm"
                disabled={isLoading}
              >
                {isLoading ? t('auth.signingIn') : t('auth.login')}
              </Button>
            </form>

            <div className="text-center mt-4">
              <button
                className="text-sm text-primary hover:underline font-mono"
                onClick={() => {
                  setShowEmailForm(false);
                  navigate("/auth");
                }}
              >
                {t('auth.noAccountRegister')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Sheet */}
      {showRegisterSheet && (
        <Sheet open={showRegisterSheet} onOpenChange={setShowRegisterSheet}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
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
                      !isTrainer ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>{t('auth.student')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTrainer(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${
                      isTrainer ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>{t('auth.trainer')}</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
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
                      type="password"
                      placeholder={t('auth.passwordPlaceholder')}
                      className="pl-10 font-mono text-sm h-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
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
                onClick={handleGoogleAuth}
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

              <div className="text-center mt-4">
                <button
                  className="text-sm text-primary hover:underline font-mono"
                  onClick={() => {
                    setShowRegisterSheet(false);
                    setShowEmailForm(true);
                  }}
                >
                  {t('auth.hasAccountLogin')}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
