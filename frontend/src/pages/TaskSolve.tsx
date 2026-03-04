import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { CodeEditor } from "@/components/CodeEditor";
import { ArrowLeft, BookOpenText, Flame, Clock3, ListChecks } from "lucide-react";
import { TestResultsDisplay } from "@/components/TestResultsDisplay";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { config } from "@/config";
import { Loader2 } from "lucide-react";

type Difficulty = "easy" | "medium" | "hard";

interface Example {
  id: string;
  input: string;
  output: string;
  explanation?: string;
}

interface TaskDetails {
  id: string;
  title: string;
  difficulty: Difficulty;
  timeLimitMs: number;
  memoryLimitMb: number;
  problemStatement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: Example[];
}

const difficultyBadge: Record<Difficulty, string> = {
  easy: "bg-green-500/15 text-green-500 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  hard: "bg-red-500/15 text-red-500 border-red-500/30",
};

const TaskSolve = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tournamentId, taskId } = useParams<{ tournamentId: string; taskId: string }>();
  const isMobile = useIsMobile();
  const { token, session } = useAuth();

  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      navigate("/auth");
      return;
    }

    if (!taskId) {
      setError(t("tasks.notFound", "Задачу не знайдено."));
      setLoading(false);
      return;
    }

    const fetchTask = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = new URL(`${config.api.baseUrl}/api/tasks/${taskId}`);
        if (tournamentId) {
          url.searchParams.set("tournament_id", tournamentId);
        }

        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.task) {
          throw new Error(data.error || `Failed to load task (${response.status})`);
        }

        const apiTask = data.task as any;

        const mapped: TaskDetails = {
          id: apiTask.id,
          title: apiTask.title,
          difficulty: (apiTask.difficulty as Difficulty) || "easy",
          timeLimitMs:
            typeof apiTask.time_limit_ms === "number"
              ? apiTask.time_limit_ms
              : typeof apiTask.time_limit_minutes === "number"
              ? apiTask.time_limit_minutes * 1000
              : 1000,
          memoryLimitMb:
            typeof apiTask.memory_limit_mb === "number" ? apiTask.memory_limit_mb : 64,
          problemStatement:
            apiTask.problem_statement ||
            apiTask.description ||
            t(
              "tasks.noStatement",
              "Опис задачі відсутній. Зверніться до тренера для оновлення умови."
            ),
          inputFormat:
            apiTask.input_format ||
            t(
              "tasks.noInputFormat",
              "Формат вхідних даних не вказаний. Переконайтеся, що умова задачі містить цю інформацію."
            ),
          outputFormat:
            apiTask.output_format ||
            t(
              "tasks.noOutputFormat",
              "Формат вихідних даних не вказаний. Переконайтеся, що умова задачі містить цю інформацію."
            ),
          constraints: apiTask.constraints
            ? String(apiTask.constraints).split("\n").filter((c: string) => c.trim().length > 0)
            : [],
          examples: Array.isArray(apiTask.examples)
            ? (apiTask.examples as any[]).map((ex, idx) => ({
                id: String(ex.id ?? idx + 1),
                input: String(ex.input ?? ""),
                output: String(ex.output ?? ""),
                explanation: ex.explanation ? String(ex.explanation) : undefined,
              }))
            : [],
        };

        setTask(mapped);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("tasks.loadError", "Не вдалося завантажити задачу.");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [session, token, taskId, tournamentId, navigate, t]);

  const headerTitle = useMemo(
    () => task?.title ?? t("tasks.unknownTask", "Задача"),
    [task, t]
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading", "Завантаження...")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm font-mono text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs mt-2"
            onClick={() => navigate(`/tournaments/${tournamentId ?? ""}`)}
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            {t("common.back", "Назад")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-2 sm:p-4">
      <Card className="h-full border-border/70 bg-card/70">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="border border-border/60 hover:bg-primary/10"
              onClick={() => navigate(`/tournaments/${tournamentId ?? ""}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpenText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-mono">
                  {headerTitle}
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                {task && (
                  <>
                    <Badge className={`${difficultyBadge[task.difficulty]} text-[11px]`}>
                      {task.difficulty === "easy"
                        ? t("tasks.difficulty.easy", "Легка")
                        : task.difficulty === "medium"
                        ? t("tasks.difficulty.medium", "Середня")
                        : t("tasks.difficulty.hard", "Складна")}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {task.timeLimitMs} ms
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {task.memoryLimitMb} MB
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <ListChecks className="h-3 w-3" />
            <span>
              {t(
                "tasks.layoutHint",
                "Інтерфейс розділено на умову зліва та редактор з тестами справа — як на LeetCode."
              )}
            </span>
          </div> */}
        </CardHeader>

        <CardContent className="p-0 h-[calc(100vh-8rem)]">
          {/* Мобільний лейаут: контент у вкладках */}
          {isMobile ? (
            <Tabs defaultValue="editor" className="h-full flex flex-col">
              <div className="px-3 pt-3 pb-1 border-b border-border/60">
                <TabsList className="w-full justify-between">
                  <TabsTrigger value="statement" className="flex-1 text-xs sm:text-sm">
                    {t("tasks.statementTab", "Умова")}
                  </TabsTrigger>
                  <TabsTrigger value="editor" className="flex-1 text-xs sm:text-sm">
                    {t("tasks.editorTab", "Редактор")}
                  </TabsTrigger>
                  <TabsTrigger value="tests" className="flex-1 text-xs sm:text-sm">
                    {t("tasks.testsTab", "Тести")}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden px-3 pb-3">
                {/* Вкладка: умова задачі */}
                <TabsContent value="statement" className="h-full mt-2">
                  <div className="h-full border border-border/70 rounded-md bg-background/40">
                    <ScrollArea className="h-full px-3 py-3">
                      {task ? (
                        <div className="space-y-4 text-sm">
                          <section>
                            <h2 className="font-mono font-semibold mb-2">
                              {t("tasks.statement", "Умова задачі")}
                            </h2>
                            <p className="text-muted-foreground whitespace-pre-line">
                              {task.problemStatement}
                            </p>
                          </section>

                          <section>
                            <h3 className="font-mono font-semibold mb-2">
                              {t("tasks.inputFormat", "Формат вхідних даних")}
                            </h3>
                            <p className="text-muted-foreground whitespace-pre-line">
                              {task.inputFormat}
                            </p>
                          </section>

                          <section>
                            <h3 className="font-mono font-semibold mb-2">
                              {t("tasks.outputFormat", "Формат вихідних даних")}
                            </h3>
                            <p className="text-muted-foreground whitespace-pre-line">
                              {task.outputFormat}
                            </p>
                          </section>

                          <section>
                            <h3 className="font-mono font-semibold mb-2">
                              {t("tasks.constraints", "Обмеження")}
                            </h3>
                            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                              {task.constraints.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          </section>

                          <section>
                            <h3 className="font-mono font-semibold mb-2">
                              {t("tasks.examples", "Приклади")}
                            </h3>
                            <div className="space-y-3">
                              {task.examples.map((ex) => (
                                <div
                                  key={ex.id}
                                  className="border border-border/60 rounded-md p-3 bg-background/60"
                                >
                                  <div className="text-xs font-mono text-muted-foreground mb-1">
                                    {t("tasks.example", "Приклад")} {ex.id}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                                    <div>
                                      <div className="text-[11px] text-muted-foreground mb-1">
                                        {t("tasks.input", "Вхід")}
                                      </div>
                                      <pre className="bg-card/70 rounded px-2 py-1 whitespace-pre-wrap">
                                        {ex.input}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className="text-[11px] text-muted-foreground mb-1">
                                        {t("tasks.output", "Вихід")}
                                      </div>
                                      <pre className="bg-card/70 rounded px-2 py-1 whitespace-pre-wrap">
                                        {ex.output}
                                      </pre>
                                    </div>
                                  </div>
                                  {ex.explanation && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {ex.explanation}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                          {t("tasks.notFound", "Задачу не знайдено.")}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>

                {/* Вкладка: редактор коду */}
                <TabsContent value="editor" className="h-full mt-2">
                  <div className="h-full border border-border/70 rounded-md bg-background/40 flex flex-col">
                    <div className="px-3 pt-3 pb-2 border-b border-border/60 flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">
                        {t(
                          "tasks.editorTitle",
                          "Редактор коду — пишіть рішення та запускайте його на власних даних."
                        )}
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <CodeEditor />
                    </div>
                  </div>
                </TabsContent>

                {/* Вкладка: тести */}
                <TabsContent value="tests" className="h-full mt-2">
                  <div className="h-full border border-border/70 rounded-md bg-background/40 flex flex-col">
                    <div className="px-3 pt-3 pb-2 border-b border-border/60 flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">
                        {t(
                          "tasks.testsTitle",
                          "Блок тестування — тут відображатимуться результати автоматичних тестів."
                        )}
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                      <TestResultsDisplay results={null} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left: problem description */}
              <ResizablePanel defaultSize={40} minSize={30} maxSize={55}>
                <div className="h-full border-r border-border/70">
                  <ScrollArea className="h-full px-4 py-4">
                    {task ? (
                      <div className="space-y-4 text-sm">
                        <section>
                          <h2 className="font-mono font-semibold mb-2">
                            {t("tasks.statement", "Умова задачі")}
                          </h2>
                          <p className="text-muted-foreground whitespace-pre-line">
                            {task.problemStatement}
                          </p>
                        </section>

                        <section>
                          <h3 className="font-mono font-semibold mb-2">
                            {t("tasks.inputFormat", "Вхідні дані")}
                            {t("tasks.inputFormat", "Вхідні дані")}
                          </h3>
                          <p className="text-muted-foreground whitespace-pre-line">
                            {task.inputFormat}
                          </p>
                        </section>

                        <section>
                          <h3 className="font-mono font-semibold mb-2">
                            {t("tasks.outputFormat", "Формат вихідних даних")}
                          </h3>
                          <p className="text-muted-foreground whitespace-pre-line">
                            {task.outputFormat}
                          </p>
                        </section>

                        <section>
                          <h3 className="font-mono font-semibold mb-2">
                            {t("tasks.constraints", "Обмеження")}
                          </h3>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            {task.constraints.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </section>

                        <section>
                          <h3 className="font-mono font-semibold mb-2">
                            {t("tasks.examples", "Приклади")}
                          </h3>
                          <div className="space-y-3">
                            {task.examples.map((ex) => (
                              <div
                                key={ex.id}
                                className="border border-border/60 rounded-md p-3 bg-background/60"
                              >
                                <div className="text-xs font-mono text-muted-foreground mb-1">
                                  {t("tasks.example", "Приклад")} {ex.id}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                                  <div>
                                    <div className="text-[11px] text-muted-foreground mb-1">
                                      {t("tasks.input", "Вхід")}
                                    </div>
                                    <pre className="bg-card/70 rounded px-2 py-1 whitespace-pre-wrap">
                                      {ex.input}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-muted-foreground mb-1">
                                      {t("tasks.output", "Вихід")}
                                    </div>
                                    <pre className="bg-card/70 rounded px-2 py-1 whitespace-pre-wrap">
                                      {ex.output}
                                    </pre>
                                  </div>
                                </div>
                                {ex.explanation && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    {ex.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        {t("tasks.notFound", "Задачу не знайдено.")}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Right: editor (top) + tests (bottom) */}
              <ResizablePanel defaultSize={60} minSize={40}>
                <ResizablePanelGroup direction="vertical" className="h-full">
                  {/* Top right: code editor */}
                  <ResizablePanel defaultSize={65} minSize={45}>
                    <div className="h-full border-b border-border/70 bg-background/40">
                      <div className="h-full flex flex-col">
                        <div className="px-4 pt-3 pb-2 border-b border-border/60 flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">
                            {t(
                              "tasks.editorTitle",
                              "Редактор коду — пишіть рішення та запускайте його на власних даних."
                            )}
                          </span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <CodeEditor />
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  {/* Bottom right: tests & output */}
                  <ResizablePanel defaultSize={35} minSize={25}>
                    <div className="h-full bg-background/40">
                      <div className="h-full flex flex-col">
                        <div className="px-4 pt-3 pb-2 border-b border-border/60 flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">
                            {t(
                              "tasks.testsTitle",
                              "Блок тестування — тут відображатимуться результати автоматичних тестів."
                            )}
                          </span>
                        </div>
                        <div className="flex-1 overflow-auto p-3">
                          {/* Поки що показуємо порожній компонент з підказкою;
                              пізніше тут можна під'єднати реальні результати тестів */}
                          <TestResultsDisplay results={null} />
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskSolve;



