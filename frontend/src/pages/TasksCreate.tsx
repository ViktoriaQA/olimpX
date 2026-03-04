import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { config } from "@/config";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, BookOpenCheck, Trash2 } from "lucide-react";

type Difficulty = "easy" | "medium" | "hard";

interface Task {
  id: string;
  title: string;
  description?: string;
  problem_statement?: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  examples?: Array<{ id: number; input: string; output: string }>;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  difficulty?: Difficulty;
  category?: string;
  points?: number;
  is_public?: boolean;
  is_active?: boolean;
}

const TasksCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token, role, session } = useAuth();
  
  const isEditing = !!id;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [constraints, setConstraints] = useState("");
  const [examplesInputText, setExamplesInputText] = useState("");
  const [examplesOutputText, setExamplesOutputText] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState<number>(1000);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(64);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [category, setCategory] = useState("");
  const [points, setPoints] = useState<number>(100);

  useEffect(() => {
    if (!session) {
      navigate("/auth");
      return;
    }

    if (role !== "trainer" && role !== "admin") {
      navigate("/dashboard");
      return;
    }

    if (!isEditing) {
      return;
    }

    const fetchTask = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${config.api.baseUrl}/api/tasks/${id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed to fetch task (${response.status})`);
        }

        const data = await response.json();
        const taskData = data.task;

        setTask(taskData);
        setTitle(taskData.title || "");
        setShortDescription(taskData.description || "");
        setProblemStatement(taskData.problem_statement || "");
        setInputFormat(taskData.input_format || "");
        setOutputFormat(taskData.output_format || "");
        setConstraints(taskData.constraints || "");
        setTimeLimitMs(taskData.time_limit_ms || 1000);
        setMemoryLimitMb(taskData.memory_limit_mb || 64);
        setDifficulty((taskData.difficulty as Difficulty) || "easy");
        setCategory(taskData.category || "");
        setPoints(taskData.points || 100);

        if (taskData.examples && Array.isArray(taskData.examples)) {
          const inputs = taskData.examples.map((ex: any) => ex.input).join('\n');
          const outputs = taskData.examples.map((ex: any) => ex.output).join('\n');
          setExamplesInputText(inputs);
          setExamplesOutputText(outputs);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load task";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [session, role, isEditing, id, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("tasks.validation.titleRequired", "Назва задачі є обов'язковою"));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let examples: any = null;
      if (examplesInputText.trim() || examplesOutputText.trim()) {
        const inputLines = examplesInputText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        const outputLines = examplesOutputText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        const maxLen = Math.max(inputLines.length, outputLines.length);
        examples = Array.from({ length: maxLen }).map((_, idx) => ({
          id: idx + 1,
          input: inputLines[idx] ?? '',
          output: outputLines[idx] ?? '',
        }));
      }

      const url = isEditing ? `${config.api.baseUrl}/api/tasks/${id}` : `${config.api.baseUrl}/api/tasks`;
      const method = isEditing ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: shortDescription.trim() || null,
          problem_statement: problemStatement.trim() || null,
          input_format: inputFormat.trim() || null,
          output_format: outputFormat.trim() || null,
          constraints: constraints.trim() || null,
          examples,
          time_limit_ms: timeLimitMs,
          memory_limit_mb: memoryLimitMb,
          difficulty,
          category: category.trim() || null,
          points,
          ...(isEditing ? {} : {
            is_public: true,
            is_active: true,
          }),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} task (${response.status})`);
      }

      navigate("/tasks");
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} task`;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setDeleteDialogOpen(false);

      const response = await fetch(`${config.api.baseUrl}/api/tasks/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Failed to delete task (${response.status})`);
      }

      navigate("/tasks");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex justify-center">
        <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading", "Завантаження...")}
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="p-4 md:p-6 flex justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm font-mono text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            onClick={() => navigate("/tasks")}
          >
            {t("common.back", "Назад")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex justify-center">
      <Card className="w-full max-w-2xl border-border/70 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/tasks")}
              className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background/40 px-2 py-1 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              {t("common.back", "Назад")}
            </button>
            <BookOpenCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg md:text-xl font-mono text-primary">
              {isEditing ? t("tasks.editTaskTitle", "Редагування задачі") : t("tasks.createTaskTitle", "Створення задачі")}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="font-mono text-[10px]">
              {t("tasks.trainerOnly", "Для тренерів")}
            </Badge>
            {isEditing && (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="font-mono text-xs"
                    disabled={submitting}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t("common.delete", "Видалити")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-mono">
                      {t("tasks.confirmDelete", "Видалення задачі")}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-mono text-sm">
                      {t("tasks.confirmDeleteMessage", "Ви впевнені, що хочете видалити цю задачу? Цю дію неможливо скасувати.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-mono text-xs">
                      {t("common.cancel", "Скасувати")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="font-mono text-xs"
                      disabled={submitting}
                    >
                      {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {t("common.delete", "Видалити")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="title" className="font-mono text-xs">
                {t("tasks.fields.title", "Назва задачі")}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("tasks.placeholders.title", "Наприклад, «Сума масиву»")}
                className="font-mono text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="font-mono text-xs">
                {t("tasks.fields.description", "Короткий опис")}
              </Label>
              <Textarea
                id="description"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder={t(
                  "tasks.placeholders.description",
                  "Коротко опишіть ідею задачі для відображення в списку."
                )}
                className="font-mono text-sm min-h-[80px]"
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="problem_statement" className="font-mono text-xs">
                  {t("tasks.fields.problemStatement", "Умова задачі")}
                </Label>
                <Textarea
                  id="problem_statement"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder={t(
                    "tasks.placeholders.problemStatement",
                    "Повний текст умови задачі, як у турнірній постановці."
                  )}
                  className="font-mono text-sm min-h-[120px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="input_format" className="font-mono text-xs">
                    {t("tasks.fields.inputFormat", "Формат вхідних даних")}
                  </Label>
                  <Textarea
                    id="input_format"
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                    placeholder={t(
                      "tasks.placeholders.inputFormat",
                      "Опишіть формат вхідних даних (рядки, числа, обмеження на розмір тощо)."
                    )}
                    className="font-mono text-sm min-h-[80px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="output_format" className="font-mono text-xs">
                    {t("tasks.fields.outputFormat", "Формат вихідних даних")}
                  </Label>
                  <Textarea
                    id="output_format"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    placeholder={t(
                      "tasks.placeholders.outputFormat",
                      "Що саме потрібно вивести, у якому форматі."
                    )}
                    className="font-mono text-sm min-h-[80px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="constraints" className="font-mono text-xs">
                  {t("tasks.fields.constraints", "Обмеження")}
                </Label>
                <Textarea
                  id="constraints"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder={t(
                    "tasks.placeholders.constraints",
                    "Кожне обмеження з нового рядка (наприклад, 1 ≤ n ≤ 100000)."
                  )}
                  className="font-mono text-sm min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="examples_input" className="font-mono text-xs">
                    {t("tasks.fields.examplesInput", "Приклади — вхідні дані")}
                  </Label>
                  <Textarea
                    id="examples_input"
                    value={examplesInputText}
                    onChange={(e) => setExamplesInputText(e.target.value)}
                    placeholder={t(
                      "tasks.placeholders.examplesInput",
                      "Кожен приклад з нового рядка, напр.:\n24\n3\n1 2 3"
                    )}
                    className="font-mono text-sm min-h-[120px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="examples_output" className="font-mono text-xs">
                    {t("tasks.fields.examplesOutput", "Приклади — очікувана відповідь")}
                  </Label>
                  <Textarea
                    id="examples_output"
                    value={examplesOutputText}
                    onChange={(e) => setExamplesOutputText(e.target.value)}
                    placeholder={t(
                      "tasks.placeholders.examplesOutput",
                      "Відповідні відповіді построчно, напр.:\n2 4\n6"
                    )}
                    className="font-mono text-sm min-h-[120px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="font-mono text-xs">
                  {t("tasks.fields.difficulty", "Складність")}
                </Label>
                <Select
                  value={difficulty}
                  onValueChange={(value: Difficulty) => setDifficulty(value)}
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue
                      placeholder={t("tasks.placeholders.difficulty", "Оберіть складність")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      {t("tasks.difficulty.easy", "Легка")}
                    </SelectItem>
                    <SelectItem value="medium">
                      {t("tasks.difficulty.medium", "Середня")}
                    </SelectItem>
                    <SelectItem value="hard">
                      {t("tasks.difficulty.hard", "Складна")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="category" className="font-mono text-xs">
                  {t("tasks.fields.category", "Категорія")}
                </Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t(
                    "tasks.placeholders.category",
                    "Напр., Масиви, Рядки, DP..."
                  )}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="points" className="font-mono text-xs">
                  {t("tasks.fields.points", "Кількість балів")}
                </Label>
                <Input
                  id="points"
                  type="number"
                  min={0}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value) || 0)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="time_limit_ms" className="font-mono text-xs">
                  {t("tasks.fields.timeLimit", "Ліміт часу (мс)")}
                </Label>
                <Input
                  id="time_limit_ms"
                  type="number"
                  min={1}
                  value={timeLimitMs}
                  onChange={(e) => setTimeLimitMs(Number(e.target.value) || 1)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="memory_limit_mb" className="font-mono text-xs">
                  {t("tasks.fields.memoryLimit", "Ліміт пам'яті (MB)")}
                </Label>
                <Input
                  id="memory_limit_mb"
                  type="number"
                  min={16}
                  value={memoryLimitMb}
                  onChange={(e) => setMemoryLimitMb(Number(e.target.value) || 64)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-mono text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-mono text-xs"
                onClick={() => navigate("/tasks")}
                disabled={submitting}
              >
                {t("common.cancel", "Скасувати")}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="font-mono text-xs"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {isEditing ? t("tasks.actions.updateTask", "Оновити задачу") : t("tasks.actions.saveTask", "Зберегти задачу")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TasksCreate;


