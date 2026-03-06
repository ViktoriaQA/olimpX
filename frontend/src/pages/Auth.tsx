import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Mail, Lock, User, GraduationCap, Trophy, Eye, EyeOff, Phone } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AuthFab } from "@/components/AuthFab";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthButtons } from "@/components/AuthButtons";

const Auth = () => {
  const { isAuthenticated, loading, login, register, loginWithGoogle, loginWithDiscord } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+380");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const isMobile = useIsMobile();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  };

  const validatePassword = (password: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (usePhone ? !phone : !email) {
      toast({
        title: "Error",
        description: `Please fill in ${usePhone ? 'phone number' : 'email'}`,
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && (!firstName || !lastName)) {
      toast({
        title: "Error",
        description: "Please fill in first name and last name",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Please fill in password",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && !validatePassword(password)) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters with uppercase, lowercase, and number",
        variant: "destructive",
      });
      return;
    }

    if (usePhone && !validatePhone(phone)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    if (!usePhone && !validateEmail(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login({
          email: usePhone ? undefined : email,
          phone: usePhone ? phone : undefined,
          password
        });
      } else {
        await register({
          email: usePhone ? undefined : email,
          phone: usePhone ? phone : undefined,
          country_code: usePhone ? countryCode : "",
          first_name: firstName,
          last_name: lastName,
          password,
          role: 'student'
        });
      }
    } catch (error) {
      // Error handling is done in auth context
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, navigate]);

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
        <div className="w-full max-w-md space-y-8">
          {/* Auth card */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-6 neon-border">
            {/* Login/Register toggle */}
            <div className="flex items-center justify-between p-0.5 bg-muted/30 rounded-lg border border-border h-9">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${!isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Register</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email/Phone toggle */}
              {/* <div className="space-y-2">
                <Label className="block text-sm font-mono text-muted-foreground mb-2">
                  <span className="text-primary">$</span> contact method
                </Label>
                <div className="flex items-center justify-between p-0.5 bg-muted/30 rounded-lg border border-border h-9">
                  <button
                    type="button"
                    onClick={() => setUsePhone(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${!usePhone ? 'bg-green-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePhone(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${usePhone ? 'bg-green-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Phone</span>
                  </button>
                </div>
              </div> */}

              {/* Email/Phone field */}
              <div className="space-y-2">
                <Label htmlFor={usePhone ? "phone" : "email"} className="font-mono text-sm">
                  <span className="text-primary">$</span> {usePhone ? "phone" : "email"}
                </Label>
                <div className="relative">
                  {usePhone ? (
                    <>
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+380123456789"
                        className="pl-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                      />
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              {/* Registration fields */}
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="font-mono text-sm">
                        <span className="text-primary">$</span> first_name
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        className="font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="font-mono text-sm">
                        <span className="text-primary">$</span> last_name
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        className="font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Password field */}
              <div className="space-y-2">
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-11 font-mono text-sm mt-6"
                disabled={isLoading}
              >
                {isLoading ? (isLogin ? 'Signing in...' : 'Registering...') : (isLogin ? 'Sign in' : 'Register')}
              </Button>
            </form>

            <AuthButtons
              onGoogleAuth={loginWithGoogle}
              onDiscordAuth={loginWithDiscord}
              isLoading={isLoading}
              variant="login"
            />
          </div>
        </div>
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
