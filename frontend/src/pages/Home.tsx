import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal, Trophy, Users, Clock, Calendar, ArrowRight, Gamepad2, Lock, Mail, Eye, EyeOff, UserPlus, LogIn, X } from "lucide-react";
import { AuthFab } from "@/components/AuthFab";
import { RegistrationSheet } from "@/components/RegistrationSheet";
import { AuthButtons } from "@/components/AuthButtons";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: "upcoming" | "active" | "completed";
  participants: number;
  maxParticipants: number;
  startDate: string;
  endDate: string;
  difficulty: "easy" | "medium" | "hard";
  prize?: string;
}

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { loginWithGoogle, register, login } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showRegisterSheet, setShowRegisterSheet] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Fetch real tournaments from API
    const fetchTournaments = async () => {
      try {
        const response = await fetch('/api/public/tournaments');
        if (response.ok) {
          const data = await response.json();
          const transformedTournaments: Tournament[] = data.tournaments.map((tournament: any) => ({
            id: tournament.id,
            name: tournament.name,
            description: tournament.description,
            status: tournament.status,
            participants: tournament._count?.tournament_participants || 0,
            maxParticipants: tournament.max_participants || 50,
            startDate: tournament.start_time,
            endDate: tournament.end_time,
            difficulty: tournament.difficulty || 'medium',
            prize: tournament.prize
          }));
          setTournaments(transformedTournaments);
        } else {
          setTournaments([]);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

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
      await login({
        email,
        password
      });
      setShowEmailForm(false);
    } catch (error) {
      console.error("Login error:", error);
      // Error handling is done in auth context
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string, firstName: string, lastName: string, isTrainer: boolean) => {
    if (!email || !password || !firstName || !lastName) {
      toast({
        title: t('common.error'),
        description: t('auth.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      console.log('📝 Submitting registration:', { email, firstName, lastName, isTrainer });
      
      // Use the auth context's register function instead of direct API call
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role: isTrainer ? 'trainer' : 'student'
      });
      
      setShowRegisterSheet(false);
    } catch (error) {
      console.error("❌ Registration error:", error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('auth.registrationFailed'),
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await loginWithGoogle();
      setShowRegisterSheet(false);
    } catch (error) {
      console.error("Google auth error:", error);
    }
  };

  const handleDiscordAuth = async () => {
    try {
      // TODO: Implement Discord auth when available
      console.log("Discord auth not yet implemented");
      setShowRegisterSheet(false);
    } catch (error) {
      console.error("Discord auth error:", error);
    }
  };

  const getStatusColor = (status: Tournament["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "upcoming":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "completed":
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
    }
  };

  const getDifficultyColor = (difficulty: Tournament["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "hard":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
    }
  };

  const getStatusText = (status: Tournament["status"]) => {
    return t(`tournaments.statusText.${status}`);
  };

  const getDifficultyText = (difficulty: Tournament["difficulty"]) => {
    return t(`tournaments.difficultyLevel.${difficulty}`);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background matrix-bg">
      {/* Header */}
      <Header showTournamentsButton={true} currentPage="home" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 pt-20">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            <Trophy className="h-12 w-12 text-primary animate-pulse-glow" />
            <h1 className="text-4xl md:text-6xl font-bold font-mono text-primary neon-text">
              {t('home.title')}
            </h1>
            <Trophy className="h-12 w-12 text-primary animate-pulse-glow" />
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground font-mono">
            {t('home.subtitle')}
          </p>
          <p className="text-lg text-muted-foreground font-mono max-w-2xl mx-auto">
            {t('home.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="font-mono text-base px-8 py-3"
              onClick={() => setShowRegisterSheet(true)}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              {t('auth.register')}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="font-mono text-base px-8 py-3 border-primary/20 hover:bg-primary/5 hover:text-green-500"
              onClick={() => navigate("/tournaments")}
            >
              <Trophy className="h-5 w-5 mr-2" />
              {t('home.viewDetails')}
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary font-mono">
                {tournaments.filter(t => t.status === "active").length}
              </div>
              <div className="text-sm text-muted-foreground font-mono">{t('home.activeTournaments')}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-accent font-mono">
                {tournaments.filter(t => t.status === "upcoming").length}
              </div>
              <div className="text-sm text-muted-foreground font-mono">{t('home.upcomingTournaments')}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-neon-cyan font-mono">
                {tournaments.reduce((sum, t) => sum + t.participants, 0)}
              </div>
              <div className="text-sm text-muted-foreground font-mono">{t('tournaments.participants')}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-neon-green font-mono">
                {tournaments.length}
              </div>
              <div className="text-sm text-muted-foreground font-mono">{t('tournaments.title')}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Tournaments */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center space-y-4 mb-8">
          <h2 className="text-3xl font-bold font-mono text-primary">
            {t('home.activeTournaments')}
          </h2>
          <p className="text-muted-foreground font-mono max-w-2xl mx-auto">
            {t('home.features.tournaments.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tournaments.slice(0, 6).map((tournament) => (
            <Card 
              key={tournament.id} 
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:neon-border transition-all duration-300 group cursor-pointer"
              onClick={() => {
                if (tournament.status === "active" || tournament.status === "upcoming") {
                  setShowRegisterSheet(true);
                }
              }}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={`${getStatusColor(tournament.status)} font-mono text-xs`}>
                    {getStatusText(tournament.status)}
                  </Badge>
                  <Badge className={`${getDifficultyColor(tournament.difficulty)} font-mono text-xs`}>
                    {getDifficultyText(tournament.difficulty)}
                  </Badge>
                </div>
                <CardTitle className="font-mono text-lg group-hover:text-primary transition-colors">
                  {tournament.name}
                </CardTitle>
                <CardDescription className="font-mono text-sm line-clamp-2">
                  {tournament.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-muted-foreground">
                      {tournament.participants}/{tournament.maxParticipants} учасників
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-muted-foreground">
                      {new Date(tournament.startDate).toLocaleDateString("uk-UA")} - {new Date(tournament.endDate).toLocaleDateString("uk-UA")}
                    </span>
                  </div>
                  {tournament.prize && (
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="font-mono text-primary font-medium">
                        {tournament.prize}
                      </span>
                    </div>
                  )}
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(tournament.participants / tournament.maxParticipants) * 100}%` }}
                  />
                </div>

                {(tournament.status === "active" || tournament.status === "upcoming") && (
                  <Button 
                    className="w-full font-mono text-sm group-hover:bg-primary/90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRegisterSheet(true);
                    }}
                  >
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    {tournament.status === "active" ? "Приєднатися" : "Зареєструватися"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            size="lg" 
            className="font-mono border-primary/20 hover:bg-primary/5 hover:text-green-500"
            onClick={() => navigate("/tournaments")}
          >
            {t('common.viewAllTournaments')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold font-mono text-primary">
            {t('common.readyForChallenge')}
          </h2>
          <p className="text-xl text-muted-foreground font-mono">
            {t('common.createAccountAndJoin')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="font-mono text-base px-8 py-3"
              onClick={() => setShowRegisterSheet(true)}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              {t('auth.register')}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="font-mono text-base px-8 py-3 border-primary/20 hover:bg-primary/5 hover:text-green-500"
              onClick={() => setShowEmailForm(true)}
            >
              <LogIn className="h-5 w-5 mr-2" />
              {t('auth.login')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer hasSidebar={false} />

      {/* Registration Sheet */}
      <RegistrationSheet
        open={showRegisterSheet}
        onOpenChange={setShowRegisterSheet}
        onSubmit={handleRegister}
        onGoogleAuth={handleGoogleAuth}
        onDiscordAuth={handleDiscordAuth}
        isLoading={isRegistering}
      />

      {/* Mobile FAB */}
      <AuthFab isMobile={isMobile} />

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
                <Label htmlFor="home-email" className="font-mono text-sm">
                  <span className="text-primary">$</span> {t('auth.email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="home-email"
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
                <Label htmlFor="home-password" className="font-mono text-sm">
                  <span className="text-primary">$</span> {t('auth.password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="home-password"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder')}
                    className="pl-10 font-mono text-sm h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-mono">{t('auth.orContinueWith')}</span>
              </div>
            </div>

            <AuthButtons
              onGoogleAuth={handleGoogleAuth}
              onDiscordAuth={handleDiscordAuth}
              isLoading={isLoading}
              variant="login"
            />

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
    </div>
  );
};

export default Home;
