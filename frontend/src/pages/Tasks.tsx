import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { config } from "@/config";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, BookOpen } from "lucide-react";

type Difficulty = "easy" | "medium" | "hard" | null;

interface Task {
  id: string;
  title: string;
  description?: string;
  difficulty?: Difficulty;
  category?: string;
  points?: number;
  created_at?: string;
}

interface TasksResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const Tasks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, session, role } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      navigate("/auth");
      return;
    }

    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${config.api.baseUrl}/api/tasks`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed to fetch tasks (${response.status})`);
        }

        const data = (await response.json()) as TasksResponse;
        setTasks(data.tasks || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load tasks";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [session, token, navigate]);

  const getDifficultyBadge = (difficulty?: Difficulty) => {
    if (!difficulty) return null;

    const base =
      difficulty === "easy"
        ? "bg-green-500/15 text-green-400 border-green-500/30"
        : difficulty === "medium"
        ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";

    const label =
      difficulty === "easy"
        ? t("tasks.difficulty.easy", "Легка")
        : difficulty === "medium"
        ? t("tasks.difficulty.medium", "Середня")
        : t("tasks.difficulty.hard", "Складна");

    return (
      <Badge className={`${base} text-[11px] font-mono`}>
        {label}
      </Badge>
    );
  };

  if (!session) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 h-full">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-mono font-bold text-primary neon-text">
              {t("tasks.libraryTitle", "Бібліотека задач")}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground font-mono">
            {t(
              "tasks.librarySubtitle",
              "Переглядайте та використовуйте задачі для тренувань або турнірів."
            )}
          </p>
        </div>

        {(role === "trainer" || role === "admin") && (
          <Button
            size="sm"
            className="font-mono text-xs md:text-sm"
            onClick={() => navigate("/tasks/create")}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("tasks.createTask", "Створити задачу")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading", "Завантаження...")}
          </div>
        </div>
      ) : error ? (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm font-mono text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => window.location.reload()}
            >
              {t("common.retry", "Спробувати ще раз")}
            </Button>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-sm font-mono text-muted-foreground">
              {t("tasks.emptyList", "Поки що немає жодної задачі.")}
            </p>
            {(role === "trainer" || role === "admin") && (
              <Button
                size="sm"
                className="font-mono text-xs"
                onClick={() => navigate("/tasks/create")}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("tasks.createFirstTask", "Створити першу задачу")}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="border-border/60 bg-card/70 hover:neon-border transition-all duration-300 cursor-pointer"
              onClick={() => {
                if (role === "trainer" || role === "admin") {
                  navigate(`/tasks/${task.id}/edit`);
                } else {
                  navigate(`/tasks/${task.id}`);
                }
              }}
            >
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm md:text-base font-mono line-clamp-1">
                    {task.title}
                  </CardTitle>
                  {getDifficultyBadge((task.difficulty as Difficulty) ?? null)}
                </div>
                {task.category && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {task.category}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {task.description && (
                  <p className="text-xs text-muted-foreground font-mono line-clamp-3">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>
                    {t("tasks.points", "{{points}} балів", {
                      points: task.points ?? 100,
                    })}
                  </span>
                  {task.created_at && (
                    <span>
                      {new Date(task.created_at).toLocaleDateString("uk-UA")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tasks;


