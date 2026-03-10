import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { CodeEditor } from "@/components/CodeEditor";
import { Loading } from "@/components/ui/loading";
import { ArrowLeft, BookOpenText, Flame, Clock3, ListChecks, Monitor } from "lucide-react";
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
  visible?: boolean;
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
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [savedCode, setSavedCode] = useState<string>('');
  const [isRestoringCode, setIsRestoringCode] = useState(false);
  const [savedTestResults, setSavedTestResults] = useState<any>(null);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [isIframeError, setIsIframeError] = useState(false);

  
  // Handle iframe loading
  const handleIframeLoad = () => {
    console.log('✅ OneCompiler iframe loaded successfully');
    console.log('🔍 Iframe details:', {
      src: 'https://onecompiler.com/embed/javascript?theme=dark&hideNew=true&hideLanguageSelection=true',
      userAgent: navigator.userAgent,
      isMobile: isMobile,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio
    });
    
    setIsIframeLoading(false);
    setIsIframeError(false);
    
    // Send log to server
    fetch(`${config.api.baseUrl}/api/logs/iframe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event: 'iframe_loaded',
        url: 'https://onecompiler.com/embed/javascript?theme=dark&hideNew=true&hideLanguageSelection=true',
        userAgent: navigator.userAgent,
        isMobile: isMobile,
        timestamp: new Date().toISOString(),
        taskId,
        tournamentId,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio
      })
    }).catch(err => console.warn('Failed to send iframe log:', err));
  };

  const handleIframeError = () => {
    console.error('❌ OneCompiler iframe failed to load');
    setIsIframeLoading(false);
    setIsIframeError(true);
    
    // Send error log to server
    fetch(`${config.api.baseUrl}/api/logs/iframe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event: 'iframe_error',
        url: 'https://onecompiler.com/embed/javascript?theme=dark&hideNew=true&hideLanguageSelection=true',
        userAgent: navigator.userAgent,
        isMobile: isMobile,
        timestamp: new Date().toISOString(),
        taskId,
        tournamentId,
        error: 'iframe_failed_to_load'
      })
    }).catch(err => console.warn('Failed to send iframe error log:', err));
  };

  const handleIframeTabClick = () => {
    console.log('🖱️ OneCompiler tab clicked, starting iframe load');
    setIsIframeLoading(true);
    setIsIframeError(false);
    
    // Send click log to server
    fetch(`${config.api.baseUrl}/api/logs/iframe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event: 'tab_clicked',
        url: 'https://onecompiler.com/embed/javascript?theme=dark&hideNew=true&hideLanguageSelection=true',
        userAgent: navigator.userAgent,
        isMobile: isMobile,
        timestamp: new Date().toISOString(),
        taskId,
        tournamentId
      })
    }).catch(err => console.warn('Failed to send tab click log:', err));
  };

  // Handle successful submission to trigger parent refresh
  const handleSuccessfulSubmit = () => {
    // Send event to parent component to refresh scores
    window.dispatchEvent(new CustomEvent('tournamentScoreUpdate', { 
      detail: { tournamentId, taskId } 
    }));
  };

  // Handle code saving
  const handleSaveCode = (code: string) => {
    console.log('💾 Saving code for task:', taskId);
    setSavedCode(code);
    // Save to localStorage
    try {
      localStorage.setItem(`task_code_${taskId}`, code);
    } catch (error) {
      console.warn('Failed to save code:', error);
    }
  };

  // Fetch last submission with test results from database
  const fetchLastSubmission = async (taskId: string, tournamentId?: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      const url = new URL(`${config.api.baseUrl}/api/tasks/${taskId}/submissions`);
      if (tournamentId) {
        url.searchParams.set("tournament_id", tournamentId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const submissions = data.submissions || [];
      
      // Get most recent submission with code and test results
      const lastSubmission = submissions.find((sub: any) => sub.code && sub.test_results);
      
      if (lastSubmission) {
        console.log('📥 Restored submission from database for task:', taskId);
        return {
          code: lastSubmission.code,
          testResults: lastSubmission.test_results
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to fetch last submission:', error);
      return null;
    }
  };

  // Restore saved code and test results from localStorage or database
  useEffect(() => {
    if (taskId) {
      const restoreCode = async () => {
        setIsRestoringCode(true);
        try {
          // First try localStorage
          const savedCodeFromStorage = localStorage.getItem(`task_code_${taskId}`);
          const savedResultsFromStorage = localStorage.getItem(`test_results_${taskId}`);
          
          if (savedCodeFromStorage) {
            console.log('📂 Restored saved code from localStorage for task:', taskId);
            setSavedCode(savedCodeFromStorage);
          }
          
          if (savedResultsFromStorage) {
            console.log('📂 Restored test results from localStorage for task:', taskId);
            setSavedTestResults(JSON.parse(savedResultsFromStorage));
          }
          
          // If no localStorage, try database
          if (!savedCodeFromStorage || !savedResultsFromStorage) {
            const submission = await fetchLastSubmission(taskId, tournamentId);
            if (submission) {
              if (!savedCodeFromStorage && submission.code) {
                setSavedCode(submission.code);
              }
              if (!savedResultsFromStorage && submission.testResults) {
                setSavedTestResults(submission.testResults);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to restore saved code:', error);
        } finally {
          setIsRestoringCode(false);
        }
      };

      restoreCode();
    }
  }, [taskId, tournamentId]);

  useEffect(() => {
    console.log('🔍 TaskSolve component mounted');
    console.log('📱 Device info:', {
      userAgent: navigator.userAgent,
      isMobile: isMobile,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      taskId,
      tournamentId
    });

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
          examples: Array.isArray(apiTask.examples_with_visibility)
            ? (apiTask.examples_with_visibility as any[]).map((ex, idx) => ({
                id: String(ex.id ?? idx + 1),
                input: String(ex.input ?? ""),
                output: String(ex.output ?? ""),
                visible: ex.visible !== false, // Default to true if not specified
                explanation: ex.explanation ? String(ex.explanation) : undefined,
              }))
            : Array.isArray(apiTask.examples)
            ? (apiTask.examples as any[]).map((ex, idx) => ({
                id: String(ex.id ?? idx + 1),
                input: String(ex.input ?? ""),
                output: String(ex.output ?? ""),
                visible: true, // Old examples are always visible
                explanation: ex.explanation ? String(ex.explanation) : undefined,
              }))
            : [],
        };

        setTask(mapped);
        console.log('✅ Task loaded successfully:', mapped.title);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("tasks.loadError", "Не вдалося завантажити задачу.");
        setError(message);
        console.error('❌ Failed to load task:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [session, token, taskId, tournamentId, navigate, t, isMobile]);

  const headerTitle = useMemo(
    () => task?.title ?? t("tasks.unknownTask", "Задача"),
    [task, t]
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
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
    <div className="h-screen p-2 sm:p-4 flex flex-col overflow-hidden">
      <Card className="flex-1 border-border/70 bg-card/70 flex flex-col overflow-hidden">
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

        <CardContent className="p-0 flex-1 overflow-hidden">
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
                  <TabsTrigger value="tests" className="flex-1 text-xs sm:text-sm" onClick={handleIframeTabClick}>
                    {t("tasks.testsTab", "Тренування")}
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
                              {t("tasks.examples", "Test Cases")}
                            </h3>
                            <div className="space-y-3">
                              {task.examples.filter(ex => ex.visible !== false).map((ex) => (
                                <div
                                  key={ex.id}
                                  className="border border-border/60 rounded-md p-3 bg-background/60"
                                >
                                  <div className="text-xs font-mono text-muted-foreground mb-1">
                                    {t("tasks.example", "Test Case")} {ex.id}
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
                  <div className="h-full border border-border/70 rounded-md bg-background/40">
                    <div className="h-full">
                      <CodeEditor 
                        examples={task?.examples || []} 
                        taskId={taskId}
                        tournamentId={tournamentId}
                        onSuccessfulSubmit={handleSuccessfulSubmit}
                        onSaveCode={handleSaveCode}
                        initialCode={savedCode}
                        initialTestResults={savedTestResults}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Вкладка: тести */}
                <TabsContent value="tests" className="h-full mt-2">
                  <div className="h-full border border-border/70 rounded-md bg-background/40">
                    <div className="h-full p-3 relative">
                      {isIframeLoading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Завантаження...</span>
                          </div>
                        </div>
                      )}
                      {isIframeError ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <div className="text-muted-foreground mb-4">
                            <Monitor className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">Не вдалося завантажити тренування</p>
                            <p className="text-xs mt-1">Спробуйте відкрити на реальному мобільному пристрої</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://onecompiler.com/embed/javascript?theme=dark', '_blank')}
                          >
                            Відкрити в новому вікні
                          </Button>
                        </div>
                      ) : (
                        <div className="h-full rounded-lg overflow-hidden">
                          <iframe
                            src="https://onecompiler.com/embed/javascript?theme=dark&hideNew=true&hideLanguageSelection=true"
                            width="100%"
                            height="100%"
                            style={{ 
                              border: 'none',
                              minHeight: '400px',
                              backgroundColor: 'transparent'
                            }}
                            title="OneCompiler JavaScript Editor"
                            loading="lazy"
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                            referrerPolicy="no-referrer-when-downgrade"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left: problem description */}
              <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
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
                            {task.examples.filter(ex => ex.visible !== false).map((ex) => (
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

              {/* Right: editor */}
              <ResizablePanel defaultSize={60} minSize={40}>
                <div className="h-full bg-background/40">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-hidden">
                      <Tabs defaultValue="local" className="h-full flex flex-col">
                        <div className="border-b border-border/60 px-4 pt-4 pb-2 flex-shrink-0">
                          <TabsList className="w-full">
                            <TabsTrigger value="local" className="flex-1">
                              {t("tasks.localEditor", "Виконання")}
                            </TabsTrigger>
                            <TabsTrigger value="onecompiler" className="flex-1" onClick={handleIframeTabClick}>
                              {t("tasks.onecompiler", "Тренування")}
                            </TabsTrigger>
                          </TabsList>
                        </div>
                        
                        <TabsContent value="local" className="flex-1 mt-0 overflow-hidden">
                          <div className="h-full">
                            <CodeEditor 
                              examples={task?.examples || []} 
                              taskId={taskId}
                              tournamentId={tournamentId}
                              onSuccessfulSubmit={handleSuccessfulSubmit}
                              onSaveCode={handleSaveCode}
                              initialCode={savedCode}
                              initialTestResults={savedTestResults}
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="onecompiler" className="flex-1 mt-0 overflow-hidden">
                          <div className="h-full p-4 relative">
                            {isIframeLoading && (
                              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm text-muted-foreground">Завантаження...</span>
                                </div>
                              </div>
                            )}
                            {isIframeError ? (
                              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <div className="text-muted-foreground mb-4">
                                  <Monitor className="h-8 w-8 mx-auto mb-2" />
                                  <p className="text-sm">Не вдалося завантажити тренування</p>
                                  <p className="text-xs mt-1">Спробуйте відкрити на реальному мобільному пристрої</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open('https://onecompiler.com/embed/javascript?theme=dark', '_blank')}
                                >
                                  Відкрити в новому вікні
                                </Button>
                              </div>
                            ) : (
                              <div className="h-full rounded-lg overflow-hidden">
                                <iframe
                                  src="https://onecompiler.com/embed/javascript?theme=dark&hideNew=true&hideLanguageSelection=true"
                                  width="100%"
                                  height="100%"
                                  style={{ 
                                    border: 'none',
                                    minHeight: '400px',
                                    backgroundColor: 'transparent'
                                  }}
                                  title="OneCompiler JavaScript Editor"
                                  loading="lazy"
                                  onLoad={handleIframeLoad}
                                  onError={handleIframeError}
                                  referrerPolicy="no-referrer-when-downgrade"
                                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                />
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskSolve;



