import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ListChecks, Timer, BarChart3 } from "lucide-react";

type Difficulty = "easy" | "medium" | "hard";

interface Task {
  id: string;
  title: string;
  difficulty: Difficulty;
  maxScore: number;
  solved: boolean;
  shortDescription: string;
  estimatedTime: string;
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

  const tasks = useMemo<Task[]>(() => {
    if (!tournamentId) return [];
    return mockTasksByTournament[tournamentId] ?? mockTasksByTournament["1"] ?? [];
  }, [tournamentId]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="border border-border/60 hover:bg-primary/10"
            onClick={() => navigate("/my-tournaments")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono text-primary">
              {t("tournaments.tasksTitle", "Задачі турніру")}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {t(
                "tournaments.tasksSubtitle",
                "Оберіть задачу, щоб перейти до сторінки розв’язання з редактором та тестами."
              )}
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

      {/* Tasks list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className="border-border/60 bg-card/70 hover:border-primary/70 hover:shadow-lg transition-all cursor-pointer"
            onClick={() =>
              navigate(`/tournaments/${tournamentId ?? "1"}/tasks/${task.id}`)
            }
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-mono text-base">
                  {task.title}
                </CardTitle>
                <Badge className={`${difficultyColor[task.difficulty]} font-mono text-[11px]`}>
                  {task.difficulty === "easy"
                    ? t("tasks.difficulty.easy", "Легка")
                    : task.difficulty === "medium"
                    ? t("tasks.difficulty.medium", "Середня")
                    : t("tasks.difficulty.hard", "Складна")}
                </Badge>
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
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/tournaments/${tournamentId ?? "1"}/tasks/${task.id}`);
                }}
              >
                {t("tasks.solve", "Розв’язати")}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TournamentTasks;



