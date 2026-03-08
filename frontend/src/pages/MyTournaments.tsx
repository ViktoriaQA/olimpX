import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Trophy, Users, Clock, Calendar, ArrowRight, Gamepad2, UserCheck, Plus, Edit, MoreVertical, Trash2, Archive, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import CreateTournamentModal from "@/components/CreateTournamentModal";
import EditTournamentModal from "@/components/EditTournamentModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: "upcoming" | "active" | "completed" | "archived";
  participants: number;
  maxParticipants: number;
  startDate?: string;
  endDate?: string;
  difficulty?: "easy" | "medium" | "hard";
  prize?: string;
  isJoined?: boolean;
  is_active?: boolean;
  show_on_public_page?: boolean;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

const MyTournaments = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key to trigger refetch
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | undefined>();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        // Fetch all tournaments
        const allResponse = await fetch('/api/tournaments', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!allResponse.ok) {
          throw new Error('Failed to fetch tournaments');
        }

        const allData = await allResponse.json();
        
        // Fetch user's tournament participations
        const myResponse = await fetch('/api/tournaments/my/participations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        let myTournamentsData: any[] = [];
        if (myResponse.ok) {
          const myData = await myResponse.json();
          myTournamentsData = myData.tournaments || [];
        }
        
        // Transform API data to frontend format
        const transformedTournaments: Tournament[] = allData.tournaments.map((tournament: any) => {
          const startDate = new Date(tournament.start_time);
          const endDate = new Date(tournament.end_time);
          const now = new Date();
          
          // Auto-update status based on dates
          let status = tournament.status;
          if (tournament.status === 'upcoming' && now >= startDate && now <= endDate) {
            status = 'active';
          } else if (tournament.status === 'active' && now > endDate) {
            status = 'completed';
          }
          
          return {
            id: tournament.id,
            name: tournament.name,
            description: tournament.description,
            status: status,
            participants: tournament._count?.tournament_participants || 0,
            maxParticipants: tournament.max_participants || 50,
            startDate: tournament.start_time,
            endDate: tournament.end_time,
            difficulty: tournament.difficulty || 'medium',
            prize: tournament.prize,
            creator: tournament.creator,
            is_active: tournament.is_active,
            show_on_public_page: tournament.show_on_public_page,
            isJoined: myTournamentsData.some(my => my.id === tournament.id)
          };
        });

        setTournaments(transformedTournaments);
        setMyTournaments(transformedTournaments.filter(t => t.isJoined));
        
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        // Fallback to mock data if API fails
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
          }
        ];
        setTournaments(mockTournaments);
        setMyTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [refreshKey, profile?.id]); // Add profile.id as dependency

  const getStatusColor = (status: Tournament["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "upcoming":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "completed":
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
      case "archived":
        return "bg-orange-500/20 text-orange-600 border-orange-500/30";
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

  const handleJoinTournament = async (tournamentId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: t('common.error'),
          description: t('auth.loginRequired'),
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join tournament');
      }

      // Update local state to reflect the join
      const updatedTournaments = tournaments.map(t => 
        t.id === tournamentId ? { 
          ...t, 
          isJoined: true, 
          participants: t.participants + 1 
        } : t
      );
      
      setTournaments(updatedTournaments);
      setMyTournaments([...myTournaments, ...updatedTournaments.filter(t => t.id === tournamentId)]);

      toast({
        title: t('common.success'),
        description: t('tournaments.successfullyJoined'),
      });
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('tournaments.failedToJoinTournament'),
        variant: "destructive",
      });
    }
  };

  const handleLeaveTournament = async (tournamentId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: t('common.error'),
          description: t('auth.loginRequired'),
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/leave`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to leave tournament');
      }
      
      // Update local state to reflect the leave
      const updatedTournaments = tournaments.map(t => 
        t.id === tournamentId ? { 
          ...t, 
          isJoined: false, 
          participants: Math.max(0, t.participants - 1) 
        } : t
      );
      
      setTournaments(updatedTournaments);
      setMyTournaments(updatedTournaments.filter(t => t.isJoined));

      toast({
        title: t('common.success'),
        description: t('tournaments.successfullyLeft'),
      });
    } catch (error) {
      console.error('Error leaving tournament:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('tournaments.failedToLeaveTournament'),
        variant: "destructive",
      });
    }
  };

  const handleTournamentClick = (tournamentId: string) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const handleEditTournament = (tournamentId: string) => {
    setEditingTournamentId(tournamentId);
    setShowEditModal(true);
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: t('common.error'),
          description: t('auth.loginRequired'),
          variant: "destructive",
        });
        return;
      }

      setDeletingTournamentId(tournamentId);

      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        
        // If tournament cannot be deleted because it's active/completed, suggest archiving first
        if (error.message?.includes('Cannot delete active or completed tournaments')) {
          toast({
            title: t('common.info'),
            description: t('tournaments.archiveFirstThenDelete'),
            variant: "default",
          });
          return;
        }
        
        // If user doesn't have Premium subscription
        if (error.message?.includes('Premium subscription required')) {
          toast({
            title: t('common.error'),
            description: t('tournaments.premiumRequiredForDeletion'),
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(error.message || 'Failed to delete tournament');
      }

      // Remove tournament from local state
      setTournaments(prev => prev.filter(t => t.id !== tournamentId));
      setMyTournaments(prev => prev.filter(t => t.id !== tournamentId));

      toast({
        title: t('common.success'),
        description: t('tournaments.tournamentDeleted'),
      });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('tournaments.failedToDeleteTournament'),
        variant: "destructive",
      });
    } finally {
      setDeletingTournamentId(undefined);
    }
  };

  const handleArchiveTournament = async (tournamentId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: t('common.error'),
          description: t('auth.loginRequired'),
          variant: "destructive",
        });
        return;
      }

      setDeletingTournamentId(tournamentId);

      const response = await fetch(`/api/tournaments/${tournamentId}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        
        // If user doesn't have Premium subscription
        if (error.message?.includes('Premium subscription required')) {
          toast({
            title: t('common.error'),
            description: t('tournaments.premiumRequiredForArchiving'),
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(error.message || 'Failed to archive tournament');
      }

      // Update tournament status in local state
      setTournaments(prev => prev.map(t => 
        t.id === tournamentId ? { ...t, status: 'archived' as const } : t
      ));
      setMyTournaments(prev => prev.map(t => 
        t.id === tournamentId ? { ...t, status: 'archived' as const } : t
      ));

      toast({
        title: t('common.success'),
        description: t('tournaments.tournamentArchived'),
      });
    } catch (error) {
      console.error('Error archiving tournament:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('tournaments.failedToArchiveTournament'),
        variant: "destructive",
      });
    } finally {
      setDeletingTournamentId(undefined);
    }
  };

  const isTournamentCreator = (tournament: Tournament) => {
    return tournament.creator && profile && tournament.creator.id === profile.id;
  };

  const hasPremiumSubscription = () => {
    return profile?.subscription_plan === 'Pro';
  };

  const canEditTournament = (tournament: Tournament) => {
    return isTournamentCreator(tournament) && (
      hasPremiumSubscription() || profile?.subscription_plan === 'Basic'
    );
  };

  const canArchiveTournament = (tournament: Tournament) => {
    return isTournamentCreator(tournament) && hasPremiumSubscription();
  };

  const canDeleteTournament = (tournament: Tournament) => {
    return isTournamentCreator(tournament) && hasPremiumSubscription();
  };

  const shouldShowTrainerBadges = (tournament: Tournament) => {
    // Show trainer-only badges for trainers/admins on their own tournaments
    return (role === 'trainer' || role === 'admin') && isTournamentCreator(tournament);
  };

  const shouldShowStatusBadge = (tournament: Tournament) => {
    // Don't show status badge for trainers/admins
    return role !== 'trainer' && role !== 'admin';
  };

  const shouldShowDifficultyBadge = (tournament: Tournament) => {
    // Don't show difficulty badge for trainers/admins
    return role !== 'trainer' && role !== 'admin';
  };

  const isUserFreeSubscription = () => {
    return profile?.subscription_plan === 'Free' || !profile?.subscription_plan;
  };

  const TournamentCard = ({ tournament, showJoinButton = true, showLeaveButton = true, isPrimary = false }: { tournament: Tournament; showJoinButton?: boolean; showLeaveButton?: boolean; isPrimary?: boolean }) => (
    <Card className={`border-border/50 bg-card/50 backdrop-blur-sm hover:neon-border transition-all duration-300 group cursor-pointer ${isPrimary ? 'border-2 border-primary/50 shadow-primary/20 shadow-lg' : ''}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Status badge - only show for non-trainers */}
            {shouldShowStatusBadge(tournament) && (
              <Badge className={`${getStatusColor(tournament.status)} font-mono text-xs`}>
                {getStatusText(tournament.status)}
              </Badge>
            )}
            {/* Difficulty badge - only show for non-trainers */}
            {shouldShowDifficultyBadge(tournament) && (
              <Badge className={`${getDifficultyColor(tournament.difficulty)} font-mono text-xs`}>
                {getDifficultyText(tournament.difficulty)}
              </Badge>
            )}
            {/* Trainer-only badges - only show for tournament creators */}
            {shouldShowTrainerBadges(tournament) && (
              <>
                {tournament.is_active && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 font-mono text-xs cursor-help">
                        {t('tournaments.activeBadge')}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs max-w-xs">
                        Тільки ваші студенти<br />
                        можуть бачити та приєднуватися<br />
                        до цього турніру
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {tournament.show_on_public_page && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 font-mono text-xs cursor-help">
                        {t('tournaments.publicBadge')}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs max-w-xs">
                        Турнір буде видимий<br />
                        всім користувачам на<br />
                        публічній сторінці турнірів
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>
          {/* Edit/Delete/Archive button for tournament creators */}
          {isTournamentCreator(tournament) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canEditTournament(tournament)) {
                      handleEditTournament(tournament.id);
                    } else {
                      toast({
                        title: t('common.error'),
                        description: t('tournaments.subscriptionRequiredForEdit'),
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!canEditTournament(tournament)}
                  className={!canEditTournament(tournament) ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  <span className="flex-1">{t('tournaments.editTournament')}</span>
                  {!canEditTournament(tournament) && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lock className="h-3 w-3 ml-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{t('tournaments.basicOrProTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </DropdownMenuItem>
                {/* Show Archive button for active/completed tournaments */}
                {(tournament.status === 'active' || tournament.status === 'completed') && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canArchiveTournament(tournament)) {
                        handleArchiveTournament(tournament.id);
                      } else {
                        toast({
                          title: t('common.error'),
                          description: t('tournaments.premiumRequiredForArchiving'),
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!canArchiveTournament(tournament)}
                    className={!canArchiveTournament(tournament) ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    <span className="flex-1">{t('tournaments.archiveTournament')}</span>
                    {!canArchiveTournament(tournament) && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-3 w-3 ml-2 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{t('tournaments.proOnlyTooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canDeleteTournament(tournament)) {
                          e.preventDefault();
                          toast({
                            title: t('common.error'),
                            description: t('tournaments.premiumRequiredForDeletion'),
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!canDeleteTournament(tournament)}
                      className={`${!canDeleteTournament(tournament) ? "opacity-50 cursor-not-allowed" : ""} text-red-600 focus:text-red-600`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span className="flex-1">{t('tournaments.deleteTournament')}</span>
                      {!canDeleteTournament(tournament) && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="h-3 w-3 ml-2 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{t('tournaments.proOnlyTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('tournaments.deleteTournamentConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('tournaments.deleteTournamentWarning')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteTournament(tournament.id)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deletingTournamentId === tournament.id}
                      >
                        {deletingTournamentId === tournament.id ? t('common.deleting') : t('common.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
          {tournament.startDate && tournament.endDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-muted-foreground">
                {new Date(tournament.startDate).toLocaleDateString(i18n.language === 'ua' ? 'uk-UA' : 'en-US')} - {new Date(tournament.endDate).toLocaleDateString(i18n.language === 'ua' ? 'uk-UA' : 'en-US')}
              </span>
            </div>
          )}
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
          <>
            {isUserFreeSubscription() && !tournament.isJoined ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    className="w-full font-mono text-sm group-hover:bg-primary/90 transition-colors opacity-75 cursor-not-allowed"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    variant="default"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {t('tournaments.join')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Доступно з підпискою Basic</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button 
                className="w-full font-mono text-sm group-hover:bg-primary/90 transition-colors"
                onClick={() => {
                  if (tournament.isJoined) {
                    handleTournamentClick(tournament.id);
                  } else {
                    handleJoinTournament(tournament.id);
                  }
                }}
                variant="default"
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
          </>
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
    <TooltipProvider>
      <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-mono text-primary neon-text">
              {t('tournaments.title')}
            </h1>
          </div>
          {role === 'trainer' || role === 'admin' ? (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="font-mono text-sm bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('tournaments.createTournament')}
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {t('tournaments.pageSubtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/50 bg-card/50 backdrop-blur-sm shadow-primary/20 shadow-lg">
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
                <TournamentCard key={tournament.id} tournament={tournament} isPrimary={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-tournaments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} showJoinButton={true} showLeaveButton={false} isPrimary={true} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          // Refresh tournaments list after successful creation
          setRefreshKey(prev => prev + 1);
          toast({
            title: t('common.success'),
            description: t('tournaments.tournamentCreated'),
          });
        }}
      />

      {/* Edit Tournament Modal */}
      <EditTournamentModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        tournamentId={editingTournamentId}
        onSuccess={() => {
          // Refresh tournaments list after successful edit
          setRefreshKey(prev => prev + 1);
          toast({
            title: t('common.success'),
            description: t('tournaments.tournamentUpdated'),
          });
        }}
      />
      </div>
    </TooltipProvider>
  );
};

export default MyTournaments;
