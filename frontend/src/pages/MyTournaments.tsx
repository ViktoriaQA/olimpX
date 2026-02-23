import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Trophy, Users, Clock, Calendar, ArrowRight, Gamepad2, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

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
  isJoined?: boolean;
}

const MyTournaments = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for tournaments
    const mockTournaments: Tournament[] = [
      {
        id: "1",
        name: "Spring Coding Challenge 2024",
        description: "Test your skills in this comprehensive coding competition featuring algorithmic challenges and problem-solving tasks.",
        status: "active",
        participants: 45,
        maxParticipants: 100,
        startDate: "2024-03-15",
        endDate: "2027-03-20",
        difficulty: "medium",
        prize: "Premium subscription + Certificate"
      },
      {
        id: "2",
        name: "Algorithm Masters",
        description: "Advanced algorithmic tournament for experienced programmers. Focus on data structures and optimization.",
        status: "upcoming",
        participants: 12,
        maxParticipants: 50,
        startDate: "2024-03-25",
        endDate: "2027-03-30",
        difficulty: "hard",
        prize: "Mentorship session"
      },
      {
        id: "3",
        name: "Beginner Friendly Contest",
        description: "Perfect for newcomers! Learn the basics of competitive programming in a supportive environment.",
        status: "completed",
        participants: 78,
        maxParticipants: 80,
        startDate: "2025-03-01",
        endDate: "2025-03-05",
        difficulty: "easy",
        prize: "Certificate + Badge"
      },
      {
        id: "4",
        name: "Speed Coding Sprint",
        description: "Race against the clock! Solve as many problems as possible in the shortest time.",
        status: "active",
        participants: 23,
        maxParticipants: 60,
        startDate: "2024-03-18",
        endDate: "2024-03-19",
        difficulty: "medium",
        prize: "Merchandise + Premium features"
      },
      {
        id: "5",
        name: "Data Structures Marathon",
        description: "Comprehensive tournament covering all major data structures and their applications.",
        status: "upcoming",
        participants: 8,
        maxParticipants: 40,
        startDate: "2024-04-01",
        endDate: "2024-04-05",
        difficulty: "hard",
        prize: "Advanced course access"
      }
    ];

    // Simulate user joining some tournaments
    const tournamentsWithJoinStatus = mockTournaments.map(tournament => ({
      ...tournament,
      isJoined: ["1", "4"].includes(tournament.id) // User joined tournaments with IDs 1 and 4
    }));

    setTimeout(() => {
      setTournaments(tournamentsWithJoinStatus);
      setMyTournaments(tournamentsWithJoinStatus.filter(t => t.isJoined));
      setLoading(false);
    }, 1000);
  }, []);

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

  const handleJoinTournament = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    // Update tournament join status
    const updatedTournaments = tournaments.map(t => 
      t.id === tournamentId ? { ...t, isJoined: true, participants: t.participants + 1 } : t
    );
    
    setTournaments(updatedTournaments);
    setMyTournaments(updatedTournaments.filter(t => t.isJoined));

    toast({
      title: t('common.success'),
      description: t('tournaments.successfullyJoined'),
    });
  };

  const handleLeaveTournament = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    // Update tournament join status
    const updatedTournaments = tournaments.map(t => 
      t.id === tournamentId ? { ...t, isJoined: false, participants: t.participants - 1 } : t
    );
    
    setTournaments(updatedTournaments);
    setMyTournaments(updatedTournaments.filter(t => t.isJoined));

    toast({
      title: t('common.success'),
      description: t('tournaments.successfullyLeft'),
    });
  };

  const handleTournamentClick = (tournamentId: string) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const TournamentCard = ({ tournament, showJoinButton = true, showLeaveButton = true }: { tournament: Tournament; showJoinButton?: boolean; showLeaveButton?: boolean }) => (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:neon-border transition-all duration-300 group cursor-pointer">
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
              {t('tournaments.participantsCount', { current: tournament.participants, max: tournament.maxParticipants })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-muted-foreground">
              {new Date(tournament.startDate).toLocaleDateString(i18n.language === 'ua' ? 'uk-UA' : 'en-US')} - {new Date(tournament.endDate).toLocaleDateString(i18n.language === 'ua' ? 'uk-UA' : 'en-US')}
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

        {showJoinButton && (tournament.status === "active" || tournament.status === "upcoming") && (
          <Button 
            className="w-full font-mono text-sm group-hover:bg-primary/90 transition-colors"
            onClick={() => {
              if (tournament.isJoined) {
                handleTournamentClick(tournament.id);
              } else {
                handleJoinTournament(tournament.id);
              }
            }}
            variant={tournament.isJoined ? "default" : "default"}
          >
            {tournament.isJoined ? (
              <>
                <Gamepad2 className="h-4 w-4 mr-2" />
                {t('tournaments.view')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                <Gamepad2 className="h-4 w-4 mr-2" />
                {t('tournaments.join')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse-glow text-primary font-mono">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-mono text-primary neon-text">
            {t('tournaments.title')}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {t('tournaments.pageSubtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary font-mono">
              {myTournaments.length}
            </div>
            <div className="text-sm text-muted-foreground font-mono">{t('tournaments.myTournaments')}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent font-mono">
              {tournaments.filter(t => t.status === "active").length}
            </div>
            <div className="text-sm text-muted-foreground font-mono">{t('home.activeTournaments')}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-neon-cyan font-mono">
              {tournaments.filter(t => t.status === "upcoming").length}
            </div>
            <div className="text-sm text-muted-foreground font-mono">{t('home.upcomingTournaments')}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-neon-green font-mono">
              {tournaments.reduce((sum, t) => sum + t.participants, 0)}
            </div>
            <div className="text-sm text-muted-foreground font-mono">{t('tournaments.totalParticipants')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-tournaments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-tournaments" className="font-mono">
            {t('tournaments.myTournaments')}
          </TabsTrigger>
          <TabsTrigger value="all-tournaments" className="font-mono">
            {t('tournaments.allTournaments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-tournaments" className="space-y-4">
          {myTournaments.length === 0 ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">{t('tournaments.noMyTournaments')}</h3>
                <p className="text-sm text-muted-foreground font-mono mb-4">
                  {t('tournaments.joinTournamentsToSee')}
                </p>
                <Button onClick={() => navigate("/tournaments?tab=all-tournaments")} className="font-mono">
                  {t('tournaments.browseAllTournaments')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-tournaments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} showJoinButton={true} showLeaveButton={false} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyTournaments;
