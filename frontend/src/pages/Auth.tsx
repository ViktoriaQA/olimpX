import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Mail, Lock, User, GraduationCap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AuthFab } from "@/components/AuthFab";
import { useIsMobile } from "@/hooks/use-mobile";

const Auth = () => {
  const { session, loading, signInWithGoogle, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 neon-glow">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <h1 className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-xl font-bold text-transparent font-mono">
              CodeArena
            </h1>
          </div>
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${!isTrainer ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTrainer(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${isTrainer ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
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
                  className="pl-10 font-mono text-sm h-11"
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
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 font-mono text-sm h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-mono">or continue with</span>
            </div>
          </div>

          <Button
            onClick={signInWithGoogle}
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
