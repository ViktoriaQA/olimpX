import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, ListChecks, Timer, BarChart3, Plus, BookOpen, Users, UserPlus, TrendingUp, Trash2, MoreVertical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AddTaskFromLibraryModal from "@/components/AddTaskFromLibraryModal";
import AddStudentModal from "@/components/AddStudentModal";

type Difficulty = "easy" | "medium" | "hard";

interface Task {
  id: string;
  title: string;
  difficulty: Difficulty;
  maxScore: number;
  solved: boolean;
  shortDescription: string;
  estimatedTime: string;
  points?: number;
  category?: string;
  time_limit?: number;
  memory_limit?: number;
}

interface StudentProgress {
  userId: string;
  userName: string;
  userEmail: string;
  taskScores: Record<string, number>;
  totalScore: number;
}

const mockTasksByTournament: Record<string, Task[]> = {
  "1": [
    {
      id: "a",
      title: "Сума масиву",
      difficulty: "easy",
      maxScore: 100,
      solved: false,
      shortDescription: "Обчислити суму елементів масиву з обмеженнями за часом.",
      estimatedTime: "10-15 хв",
    },
    {
      id: "b",
      title: "Парні й непарні",
      difficulty: "easy",
      maxScore: 150,
      solved: false,
      shortDescription: "Розділити числа на парні та непарні й підрахувати статистику.",
      estimatedTime: "15-20 хв",
    },
    {
      id: "c",
      title: "Найдовша зростаюча підпослідовність",
      difficulty: "medium",
      maxScore: 250,
      solved: false,
      shortDescription: "Знайти довжину LIS для заданої послідовності.",
      estimatedTime: "30-40 хв",
    },
  ],
};

const difficultyColor: Record<Difficulty, string> = {
  easy: "bg-green-500/15 text-green-500 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  hard: "bg-red-500/15 text-red-500 border-red-500/30",
};

const TournamentTasks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const { setOpenMobile, setOpen } = useSidebar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch tournament tasks from API
  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!tournamentId) return;
      
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          // Fallback to mock data
          setTasks(mockTasksByTournament[tournamentId] ?? mockTasksByTournament["1"] ?? []);
          setLoading(false);
          return;
        }

        console.log('Fetching tournament data for ID:', tournamentId);

        // Fetch tournament details
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('Tournament response status:', tournamentResponse.status);
        
        if (tournamentResponse.ok) {
          const tournamentData = await tournamentResponse.json();
          console.log('Tournament data received:', tournamentData);
          setTournament(tournamentData.tournament);
          setParticipants(tournamentData.tournament?.participants || []);
        } else {
          const errorData = await tournamentResponse.json().catch(() => ({}));
          console.log('Tournament fetch error:', errorData);
        }

        // Fetch tasks
        const tasksResponse = await fetch(`/api/tournaments/${tournamentId}/tasks`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('Tasks response status:', tasksResponse.status);

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          console.log('Tasks data received:', tasksData);
          const transformedTasks: Task[] = (tasksData.tasks || []).map((task: any) => ({
            id: task.id,
            title: task.title,
            difficulty: task.difficulty,
            maxScore: task.points || 100,
            solved: false, // TODO: Fetch from user progress
            shortDescription: task.description?.substring(0, 100) + '...' || '',
            estimatedTime: `${Math.ceil((task.time_limit || 1000) / 1000)}-${Math.ceil((task.time_limit || 1000) / 500)} хв`,
            points: task.points,
            category: task.category,
            time_limit: task.time_limit,
            memory_limit: task.memory_limit
          }));
          setTasks(transformedTasks);
        } else {
          // Fallback to mock data
          setTasks(mockTasksByTournament[tournamentId] ?? mockTasksByTournament["1"] ?? []);
        }
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        // Fallback to mock data
        setTasks(mockTasksByTournament[tournamentId] ?? mockTasksByTournament["1"] ?? []);
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentData();
  }, [tournamentId, refreshKey]);

  // Fetch progress data
  const fetchProgressData = async () => {
    if (!tournamentId) return;
    
    setLoadingProgress(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Fetch all participants' progress for this tournament
      const progressResponse = await fetch(`/api/tournaments/${tournamentId}/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (progressResponse.ok) {
        const data = await progressResponse.json();
        setProgressData(data.progress || []);
      } else {
        // Fallback: create mock progress data
        const mockProgress: StudentProgress[] = participants
          .filter((p: any) => p.user?.role === 'student')
          .map((participant: any) => {
            const taskScores: Record<string, number> = {};
            let totalScore = 0;
            
            tasks.forEach(task => {
              // Mock random scores for demonstration
              const score = Math.random() > 0.5 ? Math.floor(Math.random() * task.maxScore) : 0;
              taskScores[task.id] = score;
              totalScore += score;
            });

            return {
              userId: participant.user?.id || participant.id,
              userName: `${participant.user?.first_name || ''} ${participant.user?.last_name || ''}`.trim() || participant.user?.email || 'Unknown',
              userEmail: participant.user?.email || '',
              taskScores,
              totalScore
            };
          });
        
        setProgressData(mockProgress);
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Fetch progress data when tasks or participants change
  useEffect(() => {
    if (tasks.length > 0 && participants.length > 0) {
      fetchProgressData();
    }
  }, [tasks, participants, tournamentId, refreshKey]);

  const canAddTasks = role === 'trainer' || role === 'admin';
  const isTournamentCreator = tournament?.creator?.id === profile?.id || role === 'admin';

  // Функція для обробки кліку на "Розв'язати"
  const handleSolveTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    
    // Автоматично згортаємо меню при кліку на "розв'язати задачу"
    setOpenMobile(false);
    setOpen(false);
    
    navigate(`/tournaments/${tournamentId ?? "1"}/tasks/${taskId}`);
  };

  // Функція для обробки кліку на картку задачі
  const handleTaskCardClick = (taskId: string) => {
    // Автоматично згортаємо меню при кліку на картку задачі
    setOpenMobile(false);
    setOpen(false);
    
    navigate(`/tournaments/${tournamentId ?? "1"}/tasks/${taskId}`);
  };

  // Функція для видалення задачі з турніру
  const handleDeleteTask = async (taskId: string) => {
    if (!tournamentId) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: t('common.error'),
          description: t('auth.required', 'Необхідна автентифікація'),
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`/api/tournaments/${tournamentId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('tasks.taskDeletedSuccessfully', 'Задачу успішно видалено з турніру'),
        });
        // Оновлюємо список задач
        setRefreshKey(prev => prev + 1);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: t('common.error'),
          description: errorData.error?.message || t('tasks.deleteTaskError', 'Не вдалося видалити задачу'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: t('common.error'),
        description: t('tasks.deleteTaskError', 'Не вдалося видалити задачу'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="border border-border/60 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => navigate("/my-tournaments")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono text-primary">
              {tournament?.name || tournament?.title || t("tournaments.tournamentName", "Найменування турніру")}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {tournament?.description 
                ? `${tournament.description.substring(0, 100)}${tournament.description.length > 100 ? '...' : ''}`
                : t("tournaments.tasksSubtitle", "Оберіть задачу, щоб перейти до сторінки розв’язання з редактором та тестами.")
              }
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 flex items-center gap-3">
            <ListChecks className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground font-mono">
                {t("tasks.total", "Всього задач")}
              </div>
              <div className="text-lg font-mono font-semibold">
                {tasks.length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-neon-cyan" />
            <div>
              <div className="text-xs text-muted-foreground font-mono">
                {t("tasks.maxScore", "Макс. балів")}
              </div>
              <div className="text-lg font-mono font-semibold">
                {tasks.reduce((sum, task) => sum + task.maxScore, 0)}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 flex items-center gap-3">
            <Timer className="h-5 w-5 text-neon-green" />
            <div>
              <div className="text-xs text-muted-foreground font-mono">
                {t("tasks.tip", "Порада")}
              </div>
              <div className="text-xs font-mono">
                {t(
                  "tasks.focusTip",
                  "Почніть з простих задач, щоб розігрітися перед складнішими."
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks and Students Tabs */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className={`grid w-full ${canAddTasks && isTournamentCreator ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="tasks" className="font-mono">
            <BookOpen className="h-4 w-4 mr-2" />
            {t('tasks.tasks', 'Задачі')}
          </TabsTrigger>
          {canAddTasks && isTournamentCreator && (
            <TabsTrigger value="progress" className="font-mono">
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('tournaments.progress', 'Прогрес')}
            </TabsTrigger>
          )}
          {canAddTasks && isTournamentCreator && (
            <TabsTrigger value="students" className="font-mono">
              <Users className="h-4 w-4 mr-2" />
              {t('tournaments.students', 'Студенти')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-mono font-semibold text-primary">
              {t('tasks.tasks', 'Задачі турніру')}
            </h3>
            {canAddTasks && isTournamentCreator && (
              <Button
                onClick={() => setShowAddTaskModal(true)}
                className="font-mono text-sm bg-primary hover:bg-primary/90 hidden sm:flex"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {t('tasks.addFromLibrary', 'Додати з бібліотеки')}
              </Button>
            )}
            {canAddTasks && isTournamentCreator && (
              <Button
                onClick={() => setShowAddTaskModal(true)}
                className="sm:hidden bg-primary hover:bg-primary/90"
                size="icon"
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse-glow text-primary font-mono">{t('common.loading')}</div>
            </div>
          ) : tasks.length === 0 ? (
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-8 text-center">
                <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">
                  {canAddTasks && isTournamentCreator 
                    ? t('tasks.noTasksYet', 'Ще немає задач')
                    : t('tasks.noTasksAvailable', 'Немає доступних задач')
                  }
                </h3>
                <p className="text-sm text-muted-foreground font-mono mb-4">
                  {canAddTasks && isTournamentCreator
                    ? t('tasks.addFirstTask', 'Додайте першу задачу до цього турніру')
                    : t('tasks.noTasksDescription', 'Цей турнір ще не має задач для розв\'язання')
                  }
                </p>
                {canAddTasks && isTournamentCreator && (
                  <>
                    <Button onClick={() => setShowAddTaskModal(true)} className="font-mono hidden sm:flex">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {t('tasks.addFirstTaskButton', 'Додати задачу')}
                    </Button>
                    <Button onClick={() => setShowAddTaskModal(true)} className="sm:hidden" size="icon">
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-primary/60 bg-card/70 hover:border-primary hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleTaskCardClick(task.id)}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="font-mono text-base flex-1">
                        {task.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={`${difficultyColor[task.difficulty]} font-mono text-[11px]`}>
                          {task.difficulty === "easy"
                            ? t("tasks.difficulty.easy", "Легка")
                            : task.difficulty === "medium"
                            ? t("tasks.difficulty.medium", "Середня")
                            : t("tasks.difficulty.hard", "Складна")}
                        </Badge>
                        {canAddTasks && isTournamentCreator && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('tasks.delete', 'Видалити')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {task.shortDescription}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 pt-0">
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                      <span>
                        {t("tasks.score", { defaultValue: "{{score}} балів", score: task.maxScore })
                          .replace("{{score}}", String(task.maxScore))}
                      </span>
                      <span>•</span>
                      <span>{task.estimatedTime}</span>
                    </div>
                    <Button
                      size="sm"
                      className="font-mono text-xs"
                      onClick={(e) => handleSolveTask(e, task.id)}
                    >
                      {t("tasks.solve", "Розв'язати")}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Progress Tab */}
        {canAddTasks && isTournamentCreator && (
          <TabsContent value="progress" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono font-semibold text-primary">
                {t('tournaments.progress', 'Прогрес студентів')}
              </h3>
            </div>
            
            {loadingProgress ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-pulse-glow text-primary font-mono">{t('common.loading')}</div>
              </div>
            ) : progressData.length === 0 ? (
              <Card className="border-border/60 bg-card/60">
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-mono font-semibold mb-2">
                    {t('tournaments.noProgressYet', 'Ще немає даних про прогрес')}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {t('tournaments.progressDescription', 'Студенти ще не виконували задачі цього турніру')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <Card className="border-border/60 bg-card/60">
                    <CardContent className="p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-border/60">
                              <th className="text-left p-3 font-mono text-sm font-semibold text-primary sticky left-0 bg-card/60">
                                {t('tournaments.student', 'Студент')}
                              </th>
                              {tasks.map((task) => (
                                <th key={task.id} className="text-center p-3 font-mono text-xs font-semibold min-w-[80px]">
                                  <div className="space-y-1">
                                    <div className="text-primary">{task.title}</div>
                                    <Badge className={`${difficultyColor[task.difficulty]} text-[10px]`}>
                                      {task.maxScore} {t('common.points', 'балів')}
                                    </Badge>
                                  </div>
                                </th>
                              ))}
                              <th className="text-center p-3 font-mono text-sm font-semibold text-primary sticky right-0 bg-card/60">
                                {t('tournaments.total', 'Всього')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {progressData.map((student, index) => (
                              <tr key={student.userId} className={`border-b border-border/30 hover:bg-primary/5 ${index % 2 === 0 ? 'bg-card/30' : ''}`}>
                                <td className="p-3 sticky left-0 bg-card/60">
                                  <div className="space-y-1">
                                    <div className="font-mono text-sm font-medium text-primary">
                                      {student.userName}
                                    </div>
                                    <div className="font-mono text-xs text-muted-foreground">
                                      {student.userEmail}
                                    </div>
                                  </div>
                                </td>
                                {tasks.map((task) => {
                                  const score = student.taskScores[task.id] || 0;
                                  const percentage = task.maxScore > 0 ? (score / task.maxScore) * 100 : 0;
                                  
                                  return (
                                    <td key={task.id} className="text-center p-3">
                                      <div className="space-y-1">
                                        <div className={`font-mono text-sm font-medium ${
                                          score === 0 ? 'text-muted-foreground' : 
                                          score === task.maxScore ? 'text-green-500' : 'text-yellow-500'
                                        }`}>
                                          {score}/{task.maxScore}
                                        </div>
                                        {score > 0 && (
                                          <div className="w-full bg-border/60 rounded-full h-1">
                                            <div 
                                              className={`h-1 rounded-full ${
                                                score === task.maxScore ? 'bg-green-500' : 'bg-yellow-500'
                                              }`}
                                              style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="text-center p-3 sticky right-0 bg-card/60">
                                  <div className="space-y-1">
                                    <div className="font-mono text-sm font-bold text-primary">
                                      {student.totalScore}
                                    </div>
                                    <div className="font-mono text-xs text-muted-foreground">
                                      /{tasks.reduce((sum, task) => sum + task.maxScore, 0)}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {progressData.map((student) => (
                    <Card key={student.userId} className="border-border/60 bg-card/60">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="font-mono text-sm font-semibold text-primary">
                              {student.userName}
                            </h4>
                            <p className="font-mono text-xs text-muted-foreground">
                              {student.userEmail}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold text-primary">
                              {student.totalScore}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              /{tasks.reduce((sum, task) => sum + task.maxScore, 0)} {t('common.points', 'балів')}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {tasks.map((task) => {
                            const score = student.taskScores[task.id] || 0;
                            const percentage = task.maxScore > 0 ? (score / task.maxScore) * 100 : 0;
                            
                            return (
                              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-mono text-sm font-medium truncate">
                                      {task.title}
                                    </h5>
                                    <Badge className={`${difficultyColor[task.difficulty]} text-[10px] shrink-0`}>
                                      {task.difficulty === "easy"
                                        ? t("tasks.difficulty.easy", "Легка")
                                        : task.difficulty === "medium"
                                        ? t("tasks.difficulty.medium", "Середня")
                                        : t("tasks.difficulty.hard", "Складна")}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className={`font-mono text-sm font-medium ${
                                      score === 0 ? 'text-muted-foreground' : 
                                      score === task.maxScore ? 'text-green-500' : 'text-yellow-500'
                                    }`}>
                                      {score}/{task.maxScore} {t('common.points', 'балів')}
                                    </div>
                                    {score > 0 && (
                                      <div className="flex-1 max-w-[100px]">
                                        <div className="w-full bg-border/60 rounded-full h-2">
                                          <div 
                                            className={`h-2 rounded-full ${
                                              score === task.maxScore ? 'bg-green-500' : 'bg-yellow-500'
                                            }`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        )}

        {canAddTasks && isTournamentCreator && (
          <TabsContent value="students" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-mono font-semibold text-primary">
                {t('tournaments.students', 'Студенти')}
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAddStudentModal(true)}
                  variant="outline"
                  className="font-mono text-sm hidden sm:flex"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('tournaments.addStudent', 'Додати студента')}
                </Button>
                <Button
                  onClick={() => setShowAddStudentModal(true)}
                  variant="outline"
                  className="sm:hidden"
                  size="icon"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          <Card className="border-border/60 bg-card/60">
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-mono font-semibold mb-2">
                    {t('tournaments.noStudentsYet', 'Ще немає студентів')}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono mb-4">
                    {t('tournaments.addFirstStudent', 'Додайте першого студента за допомогою кнопки вище')}
                  </p>
                  <div className="flex justify-center">
                    <Button onClick={() => setShowAddStudentModal(true)} className="font-mono hidden sm:flex">
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('tournaments.addFirstStudentButton', 'Додати студента')}
                    </Button>
                    <Button onClick={() => setShowAddStudentModal(true)} className="sm:hidden" size="icon">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {participants.filter((p: any) => p.user?.role === 'student').map((participant: any) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-mono font-medium text-primary">
                            {participant.user?.first_name?.[0]?.toUpperCase() || participant.user?.email[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-mono text-sm font-medium">
                            {participant.user?.first_name} {participant.user?.last_name}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {participant.user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {participant.user?.role}
                        </Badge>
                        <Badge className="font-mono text-xs">
                          {participant.status === 'registered' 
                            ? t('tournaments.registered', 'Зареєстровано')
                            : participant.status === 'active'
                            ? t('tournaments.active', 'Активний')
                            : participant.status
                          }
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* Add Task Modal */}
      {canAddTasks && isTournamentCreator && (
        <AddTaskFromLibraryModal
          open={showAddTaskModal}
          onOpenChange={setShowAddTaskModal}
          tournamentId={tournamentId!}
          onSuccess={() => {
            setRefreshKey(prev => prev + 1);
            toast({
              title: t('common.success'),
              description: t('tasks.tasksAddedSuccessfully'),
            });
          }}
        />
      )}

      {/* Add Student Modal */}
      {canAddTasks && isTournamentCreator && (
        <AddStudentModal
          open={showAddStudentModal}
          onOpenChange={setShowAddStudentModal}
          tournamentId={tournamentId!}
          onSuccess={() => {
            setRefreshKey(prev => prev + 1);
            toast({
              title: t('common.success'),
              description: t('tournaments.studentAddedSuccessfully'),
            });
          }}
        />
      )}
    </div>
  );
};

export default TournamentTasks;



