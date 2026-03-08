import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, TrendingUp, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TournamentScoreCardProps {
  tournamentId: string;
  tournamentName?: string;
  maxScore?: number;
  className?: string;
  refreshKey?: number;
}

interface UserProgress {
  totalScore: number;
  maxScore: number;
  completedTasks: number;
  totalTasks: number;
  recentSubmissions: Array<{
    taskId: string;
    taskTitle: string;
    score: number;
    maxScore: number;
    submittedAt: string;
  }>;
}

const TournamentScoreCard: React.FC<TournamentScoreCardProps> = ({
  tournamentId,
  tournamentName,
  maxScore = 100,
  className = "",
  refreshKey = 0
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!tournamentId || !profile) return;

      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        // Fetch user's progress for this tournament
        const response = await fetch(`/api/tournaments/${tournamentId}/progress`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('Progress response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Progress data received:', data);
          console.log('Current user ID:', profile?.id);
          console.log('Available progress entries:', data.progress?.map((p: any) => ({ userId: p.userId, userName: p.userName, totalScore: p.totalScore })));
          
          // Find current user's progress from the list
          const currentUserProgress = data.progress?.find((p: any) => p.userId === profile?.id);
          console.log('Current user progress:', currentUserProgress);
          
          if (currentUserProgress) {
            // Calculate total score and max score
            const totalScore = currentUserProgress.totalScore || 0;
            const completedTasks = Object.values(currentUserProgress.taskScores || {}).filter((score: any) => score > 0).length;
            const totalTasks = data.tasks?.length || 0;
            
            // Get recent submissions
            const recentSubmissions = await fetchRecentSubmissions(tournamentId, token);

            setUserProgress({
              totalScore,
              maxScore: maxScore, // Will be calculated from tasks
              completedTasks,
              totalTasks,
              recentSubmissions
            });
          } else {
            // No progress found for current user
            setUserProgress({
              totalScore: 0,
              maxScore,
              completedTasks: 0,
              totalTasks: data.tasks?.length || 0,
              recentSubmissions: []
            });
          }
        } else {
          // Fallback to zero progress
          setUserProgress({
            totalScore: 0,
            maxScore,
            completedTasks: 0,
            totalTasks: 0,
            recentSubmissions: []
          });
        }
      } catch (error) {
        console.error('Error fetching user progress:', error);
        // Fallback to zero progress
        setUserProgress({
          totalScore: 0,
          maxScore,
          completedTasks: 0,
          totalTasks: 0,
          recentSubmissions: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProgress();
  }, [tournamentId, profile, maxScore, refreshKey]);

  const fetchRecentSubmissions = async (tournamentId: string, token: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.submissions?.slice(0, 3).map((sub: any) => ({
          taskId: sub.task_id,
          taskTitle: sub.task_title || `Задача ${sub.task_id}`,
          score: sub.score || 0,
          maxScore: sub.max_score || 100,
          submittedAt: sub.submitted_at
        })) || [];
      }
    } catch (error) {
      console.error('Error fetching recent submissions:', error);
    }
    return [];
  };

  const scorePercentage = userProgress ? (userProgress.totalScore / userProgress.maxScore) * 100 : 0;
  const completionPercentage = userProgress?.totalTasks > 0 ? (userProgress.completedTasks / userProgress.totalTasks) * 100 : 0;

  if (loading) {
    return (
      <Card className={`border-border/60 bg-card/60 ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-border/60 bg-card/60 hover:border-primary/50 transition-all duration-300 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono font-semibold text-primary flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {tournamentName || t('tournaments.score', 'Результати турніру')}
          </CardTitle>
          <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
            {userProgress?.completedTasks || 0}/{userProgress?.totalTasks || 0} {t('tasks.completed', 'виконано')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold font-mono text-primary">
            {userProgress?.totalScore || 0}
            <span className="text-xl text-muted-foreground font-normal">
              /{userProgress?.maxScore || maxScore} {t('common.points', 'балів')}
            </span>
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            {t('tournaments.currentScore', 'Поточний результат')}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>{t('common.progress', 'Прогрес')}</span>
            <span>{Math.round(scorePercentage)}%</span>
          </div>
          <Progress 
            value={scorePercentage} 
            className="h-2 bg-muted/50"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-card/50 rounded-lg border border-border/30">
            <div className="flex items-center justify-center gap-2 text-green-500 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-lg font-bold font-mono">
                {userProgress?.completedTasks || 0}
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {t('tasks.solved', 'Розв\'язано')}
            </div>
          </div>
          
          <div className="text-center p-3 bg-card/50 rounded-lg border border-border/30">
            <div className="flex items-center justify-center gap-2 text-blue-500 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-bold font-mono">
                {Math.round(completionPercentage)}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {t('tournaments.completion', 'Виконання')}
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        {userProgress?.recentSubmissions && userProgress.recentSubmissions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-mono font-semibold text-primary flex items-center gap-2">
              <Award className="h-4 w-4" />
              {t('tournaments.recentSubmissions', 'Останні спроби')}
            </div>
            <div className="space-y-1">
              {userProgress.recentSubmissions.map((submission, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-card/30 rounded border border-border/20">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-medium truncate">
                      {submission.taskTitle}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {new Date(submission.submittedAt).toLocaleDateString('uk-UA')}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className={`text-sm font-mono font-bold ${
                      submission.score === submission.maxScore 
                        ? 'text-green-500' 
                        : submission.score > 0 
                        ? 'text-yellow-500' 
                        : 'text-muted-foreground'
                    }`}>
                      {submission.score}/{submission.maxScore}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivational Message */}
        <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-sm font-mono text-primary">
            {scorePercentage === 0 
              ? t('tournaments.startSolving', 'Почніть розв\'язувати задачі, щоб заробити бали!')
              : scorePercentage < 50
              ? t('tournaments.keepGoing', 'Хороша робота! Продовжуйте в тому ж дусі!')
              : scorePercentage < 80
              ? t('tournaments.greatProgress', 'Чудовий прогрес! Ви майже біля мети!')
              : scorePercentage < 100
              ? t('tournaments.almostThere', 'Відмінно! Залишилося всього трохи!')
              : t('tournaments.perfect', 'Ідеально! Ви завершили турнір!')
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentScoreCard;
