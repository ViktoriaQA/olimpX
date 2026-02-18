import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { LogIn, UserPlus, Mail, Lock, GraduationCap, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AuthFabProps {
  isMobile: boolean;
}

export function AuthFab({ isMobile }: AuthFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const { toast } = useToast();
  const { signInWithGoogle } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Помилка",
        description: "Будь ласка, заповніть всі поля",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement email/password auth
      console.log(`${isLogin ? 'Signing in' : 'Registering'} with:`, { email, role: isTrainer ? 'trainer' : 'student' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Успіх",
        description: isLogin ? "Перевірте пошту для входу" : "Перевірте пошту для підтвердження реєстрації",
      });
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "Помилка",
        description: "Не вдалося виконати операцію. Спробуйте ще раз.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
      setIsOpen(false);
    } catch (error) {
      console.error("Google auth error:", error);
    }
  };

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-background"
          >
            <LogIn className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="text-left mb-6">
            <SheetTitle className="text-xl font-bold">
              {isLogin ? "Вхід" : "Реєстрація"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            {/* Toggle between Login/Register */}
            <div className="flex items-center justify-center p-1 bg-muted/30 rounded-lg border border-border">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  isLogin ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Вхід
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !isLogin ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Реєстрація
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {/* Role Selector */}
              <div className="space-y-2">
                <Label className="block text-sm font-mono text-muted-foreground mb-2">
                  <span className="text-primary">$</span> оберіть роль
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
                    <span>Студент</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTrainer(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 rounded-md text-sm transition-colors ${
                      isTrainer ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Тренер</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fab-email" className="font-mono text-sm">
                  <span className="text-primary">$</span> email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fab-email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10 font-mono text-sm h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fab-password" className="font-mono text-sm">
                  <span className="text-primary">$</span> пароль
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fab-password"
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
                className="w-full h-11 font-mono text-sm"
                disabled={isLoading}
              >
                {isLoading ? (isLogin ? 'Вхід...' : 'Реєстрація...') : (isLogin ? 'Увійти' : 'Зареєструватися')}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-mono">або продовжити з</span>
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
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
