import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Mail, Lock, User, GraduationCap, Trophy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AuthFab } from "@/components/AuthFab";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthButtons } from "@/components/AuthButtons";

const Auth = () => {
  const { session, loading, signInWithGoogle, signInWithDiscord, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const isMobile = useIsMobile();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    const role = isTrainer ? 'trainer' : 'student';

    setIsLoading(true);
    try {
      // TODO: Implement email/password sign in
      console.log("Signing in with:", { email, role });
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Check your email for a magic link",
      });
    } catch (error) {
      console.error("Sign in error:", error);
      toast({
        title: "Error",
        description: "Failed to sign in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && session) {
      if (profile && !profile.onboarded) {
        navigate("/onboarding");
      } else if (profile?.onboarded) {
        navigate("/dashboard");
      }
    }
  }, [loading, session, profile, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background matrix-bg">
        <div className="animate-pulse-glow text-primary font-mono text-lg">
          Initializing...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background matrix-bg relative overflow-hidden">
      {/* Header */}
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="font-mono text-xs h-8 px-3 hover:bg-primary/5 text-muted-foreground hover:text-primary"
              onClick={() => navigate("/tournaments")}
            >
              <Trophy className="h-4 w-4 mr-1" />
              Турніри
            </Button>
            {!isMobile && (
              <Button 
                variant="outline" 
                size="sm" 
                className="font-mono text-xs h-8 px-3 border-primary/20 hover:bg-primary/5"
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              >
                Увійти
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        {!isMobile && (
          <div className="w-full max-w-md space-y-8">
            {/* Login card */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-6 neon-border">
          <form onSubmit={handleEmailSignIn} className="space-y-6">
            {/* Role Selector */}
            <div className="space-y-2">
              <Label className="block text-sm font-mono text-muted-foreground mb-2">
                <span className="text-primary">$</span> select role
              </Label>
              <div className="flex items-center justify-between p-0.5 bg-muted/30 rounded-lg border border-border h-9">
                <button
                  type="button"
                  onClick={() => setIsTrainer(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${!isTrainer ? 'bg-green-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTrainer(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${isTrainer ? 'bg-green-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Trainer</span>
                </button>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="email" className="font-mono text-sm">
                <span className="text-primary">$</span> email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="password" className="font-mono text-sm">
                <span className="text-primary">$</span> password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
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
              className="w-full h-11 font-mono text-sm mt-6"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <AuthButtons
            onGoogleAuth={signInWithGoogle}
            onDiscordAuth={signInWithDiscord}
            isLoading={isLoading}
            variant="login"
          />

          {/* <div className="text-xs text-muted-foreground font-mono text-center">
            <span className="text-primary/50">//</span> secure authentication via OAuth 2.0
          </div> */}
        </div>

        </div>
          )
        }
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-4">
        <div className="container mx-auto px-4">
          <p className="text-xs text-center text-muted-foreground font-mono">
            v1.0.0 | &copy; {new Date().getFullYear()} CodeArena
          </p>
        </div>
      </footer>
      
      {/* Mobile FAB */}
      <AuthFab isMobile={isMobile} />
    </div>
  );
};

export default Auth;
