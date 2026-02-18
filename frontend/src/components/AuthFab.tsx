import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, UserPlus, Plus, X, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationSheet } from "@/components/RegistrationSheet";

interface AuthFabProps {
  isMobile: boolean;
}

export function AuthFab({ isMobile }: AuthFabProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showRegisterSheet, setShowRegisterSheet] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast, signInWithGoogle, signInWithDiscord } = useAuth();

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

  const handleRegister = async (email: string, password: string, isTrainer: boolean) => {
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
      setShowRegisterSheet(false);
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

  const handleDiscordAuth = async () => {
    try {
      await signInWithDiscord();
      setShowRegisterSheet(false);
    } catch (error) {
      console.error("Discord auth error:", error);
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
                    className="pl-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
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
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="pl-10 pr-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
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
                {isLoading ? t('auth.signingIn') : t('auth.login')}
              </Button>
            </form>

            <div className="text-center mt-4">
              <button
                className="text-sm text-primary hover:underline font-mono"
                onClick={() => {
                  setShowEmailForm(false);
                  setShowRegisterSheet(true);
                }}
              >
                {t('auth.noAccountRegister')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Sheet */}
      <RegistrationSheet
        open={showRegisterSheet}
        onOpenChange={setShowRegisterSheet}
        onSubmit={handleRegister}
        onGoogleAuth={handleGoogleAuth}
        onDiscordAuth={handleDiscordAuth}
        isLoading={isLoading}
      />
    </div>
  );
}
