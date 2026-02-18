import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Trophy, LogIn, UserPlus, X, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationSheet } from "@/components/RegistrationSheet";

interface HeaderProps {
  showTournamentsButton?: boolean;
  showHomeButton?: boolean;
  currentPage?: "home" | "tournaments";
}

export function Header({ 
  showTournamentsButton = true, 
  showHomeButton = false,
  currentPage = "home" 
}: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast, signInWithGoogle, signInWithDiscord } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showRegisterSheet, setShowRegisterSheet] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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
    setIsRegistering(true);
    try {
      // TODO: Implement registration logic
      console.log("Registering:", { email, isTrainer });
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
      setIsRegistering(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
      setShowRegisterSheet(false);
    } catch (error) {
      console.error("Google auth error:", error);
      toast({
        title: t('common.error'),
        description: t('auth.googleAuthFailed'),
        variant: "destructive",
      });
    }
  };

  const handleDiscordAuth = async () => {
    try {
      await signInWithDiscord();
      setShowRegisterSheet(false);
    } catch (error) {
      console.error("Discord auth error:", error);
      toast({
        title: t('common.error'),
        description: t('auth.discordAuthFailed'),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 neon-glow cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => navigate("/")}
            >
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <h1 
              className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-xl font-bold text-transparent font-mono cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/")}
            >
              CodeArena
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {showHomeButton && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="font-mono text-xs h-8 px-3 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                onClick={() => navigate("/")}
              >
                <span className="hidden md:inline">{t('navigation.home')}</span>
              </Button>
            )}
            {showTournamentsButton && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="font-mono text-xs h-8 px-3 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                onClick={() => navigate("/tournaments")}
              >
                {currentPage === "home" && <Trophy className="h-4 w-4 mr-1" />}
                <span className="hidden md:inline">{t('navigation.tournaments')}</span>
              </Button>
            )}
            {isMobile ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="font-mono text-xs h-8 px-3 border-primary/20 hover:bg-primary/5 hover:text-green-500"
                onClick={() => setShowEmailForm(true)}
              >
                <LogIn className="h-4 w-4" />
                {t('auth.login')}
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-mono text-xs h-8 px-3 border-primary/20 hover:bg-primary/5 hover:text-green-500"
                  onClick={() => setShowEmailForm(true)}
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  {t('auth.login')}
                </Button>
                <Button 
                  size="lg" 
                  className="font-mono text-xs h-8 px-3"
                  onClick={() => setShowRegisterSheet(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {t('auth.register')}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Email Form Modal */}
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
                <Label htmlFor={`${currentPage}-email`} className="font-mono text-sm">
                  <span className="text-primary">$</span> {t('auth.email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`${currentPage}-email`}
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
                <Label htmlFor={`${currentPage}-password`} className="font-mono text-sm">
                  <span className="text-primary">$</span> {t('auth.password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`${currentPage}-password`}
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
        isLoading={isRegistering}
      />
    </>
  );
}
