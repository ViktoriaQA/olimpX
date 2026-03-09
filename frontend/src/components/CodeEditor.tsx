import React, { useRef, useEffect, useState } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Play, Code, Terminal, Save, Settings, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Alert, AlertDescription } from "./ui/alert";
import { TestResultsDisplay } from "./TestResultsDisplay";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui/resizable";

/**
 * Інтерфейс для мови програмування
 */
interface Language {
  name: string;
  versions: string[];
}

/**
 * Інтерфейс для результату виконання коду
 */
interface ExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  time: number;
  memory: number;
  signal: string | null;
  compile_output?: string;
}

/**
 * Інтерфейс для відповіді API
 */
interface ExecutionResponse {
  language: string;
  version: string;
  output: ExecutionResult;
  execution_time_ms: number;
  memory_used_mb: number;
  status: string;
}

interface Example {
  id: string;
  input: string;
  output: string;
  visible?: boolean;
  explanation?: string;
}

interface TestResults {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  total_time: number;
  test_cases: Array<{
    id: string;
    name: string;
    input: string;
    expected_output: string;
    actual_output?: string;
    passed?: boolean;
    execution_time?: number;
    memory_usage?: number;
    error?: string;
    visible?: boolean;
  }>;
  score: number;
}

interface CodeEditorProps {
  examples?: Example[];
  taskId?: string;
  tournamentId?: string;
  onSaveCode?: (code: string) => void;
  onSuccessfulSubmit?: () => void;
  initialCode?: string;
}

/**
 * Компонент редактора коду з підтримкою CodeMirror
 * Оптимізовано для мобільних пристроїв та сенсорного введення
 * Підтримує JavaScript, TypeScript, Python та C++
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  examples = [], 
  taskId, 
  tournamentId, 
  onSaveCode,
  onSuccessfulSubmit,
  initialCode
}) => {
  const editorRef = useRef<any>(null);
  const isMobile = useIsMobile();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [code, setCode] = useState<string>(initialCode || '// Ваш JavaScript код\nconsole.log("Hello, World!");');
  const [stdin, setStdin] = useState<string>('');
  const [result, setResult] = useState<ExecutionResponse | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTestsLoading, setIsTestsLoading] = useState<boolean>(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [error, setError] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState<number>(10000);
  const [memoryLimit, setMemoryLimit] = useState<number>(128);
  const [activeTab, setActiveTab] = useState<string>('input');

  // Update code when initialCode changes
  useEffect(() => {
    if (initialCode && initialCode !== code) {
      setCode(initialCode);
    }
  }, [initialCode]);

  /**
   * Шаблони коду для різних мов
   */
  const codeTemplates: Record<string, string> = {
    javascript: `// JavaScript код
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const n = 10;
console.log(\`Fibonacci(\${n}) = \${fibonacci(n)}\`);`,
    
    typescript: `// TypeScript код
interface Person {
  name: string;
  age: number;
}

function greet(person: Person): string {
  return \`Hello, \${person.name}! You are \${person.age} years old.\`;
}

const person: Person = { name: "Alice", age: 25 };
console.log(greet(person));`,
    
    python: `# Python код
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

n = 5
print(f"Factorial({n}) = {factorial(n)}")`,
    
    cpp: `// C++ код
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> numbers = {5, 2, 8, 1, 9};
    
    std::sort(numbers.begin(), numbers.end());
    
    std::cout << "Sorted numbers: ";
    for (int num : numbers) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
    
    return 0;
}`
  };

  /**
   * Отримати розширення CodeMirror для вибраної мови програмування
   */
  const getCodeMirrorExtension = (language: string) => {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return javascript({ jsx: true, typescript: language === 'typescript' });
      case 'python':
        return python();
      case 'cpp':
        return cpp();
      default:
        return [];
    }
  };

  /**
   * Завантажити збережені результати тестів з localStorage
   */
  useEffect(() => {
    if (taskId) {
      try {
        const savedResults = localStorage.getItem(`test_results_${taskId}`);
        if (savedResults) {
          setTestResults(JSON.parse(savedResults));
        }
      } catch (error) {
        console.warn('Failed to load saved test results:', error);
      }
    }
  }, [taskId]);

  /**
   * Автоматично заповнювати вхідні дані з першого видимого прикладу
   */
  useEffect(() => {
    const visibleExamples = examples.filter(ex => ex.visible !== false);
    if (visibleExamples.length > 0 && !stdin) {
      setStdin(visibleExamples[0].input);
    }
  }, [examples, stdin]);

  /**
   * Завантажити список доступних мов
   */
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/code-execution/languages`);
        const data = await response.json();
        
        if (data.success) {
          setAvailableLanguages(data.data);
          // Встановити першу доступну версію для поточної мови
          const currentLang = data.data.find((lang: Language) => lang.name === selectedLanguage);
          if (currentLang && currentLang.versions.length > 0) {
            setSelectedVersion(currentLang.versions[currentLang.versions.length - 1]);
          }
        }
      } catch (err) {
        console.error('Помилка завантаження мов:', err);
        setError('Не вдалося завантажити список мов');
      }
    };

    loadLanguages();
  }, []);

  /**
   * Обробник зміни мови
   */
  const handleLanguageChange = (language: string, version?: string) => {
    setSelectedLanguage(language);
    setCode(codeTemplates[language] || '');
    setResult(null);
    setError('');

    // Встановити версію для нової мови
    if (version) {
      setSelectedVersion(version);
    } else {
      const langInfo = availableLanguages.find(lang => lang.name === language);
      if (langInfo && langInfo.versions.length > 0) {
        setSelectedVersion(langInfo.versions[langInfo.versions.length - 1]);
      }
    }
  };

  /**
   * Обробник монтування редактора
   */
  const handleEditorDidMount = () => {
    // CodeMirror автоматично налаштовується через props
  };

  /**
   * Виконати код
   */
  const executeCode = async () => {
    if (!code.trim()) {
      setError('Будь ласка, введіть код для виконання');
      setActiveTab('output');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);
    setActiveTab('output');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/code-execution/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: selectedLanguage,
          version: selectedVersion,
          code,
          stdin,
          time_limit: timeLimit,
          memory_limit: memoryLimit * 1024 * 1024, // Конвертуємо MB в байти
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || 'Помилка виконання коду');
      }
    } catch (err) {
      console.error('Помилка виконання:', err);
      setError('Не вдалося виконати код. Перевірте з\'єднання з сервером.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Виконати код (RUN - тільки видимі тести)
   */
  const runCodeOnly = async () => {
    if (!code.trim()) {
      setError('Будь ласка, напишіть код перед виконанням');
      return;
    }

    try {
      // Fetch all test cases for execution (including hidden ones)
      let testCases;
      if (taskId) {
        const token = localStorage.getItem('auth_token');
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/tasks/${taskId}/test-cases`);
        if (tournamentId) {
          url.searchParams.set("tournament_id", tournamentId);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json();
        if (data.success) {
          testCases = data.test_cases.map((tc: any) => ({
            input: tc.input,
            expected_output: tc.expected_output,
            visible: tc.visible !== false
          }));
        }
      }

      // Fallback to examples if no test cases from API
      if (!testCases || testCases.length === 0) {
        testCases = examples.map(ex => ({
          input: ex.input,
          expected_output: ex.output,
          visible: ex.visible !== false
        }));
      }

      if (testCases.length === 0) {
        setError('Немає доступних тестів для виконання');
        setActiveTab('tests');
        return;
      }

      setIsTestsLoading(true);
      setError('');
      setTestResults(null);
      setActiveTab('tests');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/code-execution/run-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: selectedLanguage,
          code,
          test_cases: testCases,
          run_only_visible: true, // RUN: тільки видимі тести
          time_limit: timeLimit,
          memory_limit: memoryLimit * 1024 * 1024,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResults(data.data);
        
        // Зберегти результати тестів в localStorage
        if (taskId) {
          try {
            localStorage.setItem(`test_results_${taskId}`, JSON.stringify(data.data));
          } catch (error) {
            console.warn('Failed to save test results:', error);
          }
        }
        
        // Зберегти код після успішного запуску тестів
        if (onSaveCode) {
          onSaveCode(code);
        }
      } else {
        setError(data.message || 'Помилка виконання тестів');
      }
    } catch (err) {
      console.error('Error running tests:', err);
      setError('Не вдалося виконати тести. Перевірте з\'єднання з сервером.');
    } finally {
      setIsTestsLoading(false);
    }
  };

  /**
   * Виконати всі тести та відправити рішення (SEND - всі тести)
   */
  const runAllTestsAndSubmit = async () => {
    if (!code.trim()) {
      setError('Будь ласка, напишіть код перед виконанням тестів');
      return;
    }

    try {
      // Fetch all test cases for execution (including hidden ones)
      let testCases;
      if (taskId) {
        const token = localStorage.getItem('auth_token');
        const url = new URL(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/tasks/${taskId}/test-cases`);
        if (tournamentId) {
          url.searchParams.set("tournament_id", tournamentId);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json();
        if (data.success) {
          testCases = data.test_cases.map((tc: any) => ({
            input: tc.input,
            expected_output: tc.expected_output,
            visible: tc.visible !== false
          }));
        }
      }

      // Fallback to examples if no test cases from API
      if (!testCases || testCases.length === 0) {
        testCases = examples.map(ex => ({
          input: ex.input,
          expected_output: ex.output,
          visible: ex.visible !== false
        }));
      }

      if (testCases.length === 0) {
        setError('Немає доступних тестів для виконання');
        setActiveTab('tests');
        return;
      }

      setIsTestsLoading(true);
      setError('');
      setTestResults(null);
      setActiveTab('tests');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/code-execution/run-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: selectedLanguage,
          code,
          test_cases: testCases,
          run_only_visible: false, // SEND: всі тести
          time_limit: timeLimit,
          memory_limit: memoryLimit * 1024 * 1024,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResults(data.data);
        
        // Зберегти результати тестів в localStorage
        if (taskId) {
          try {
            localStorage.setItem(`test_results_${taskId}`, JSON.stringify(data.data));
          } catch (error) {
            console.warn('Failed to save test results:', error);
          }
        }
        
        // Зберегти код після успішного запуску тестів
        if (onSaveCode) {
          onSaveCode(code);
        }

        // Якщо є taskId, відправити результати на сервер
        if (taskId) {
          await submitSolution(data.data);
        }
      } else {
        setError(data.message || 'Помилка виконання тестів');
      }
    } catch (err) {
      console.error('Error running tests:', err);
      setError('Не вдалося виконати тести. Перевірте з\'єднання з сервером.');
    } finally {
      setIsTestsLoading(false);
    }
  };
  const clearSavedResults = () => {
    if (taskId) {
      try {
        localStorage.removeItem(`test_results_${taskId}`);
        setTestResults(null);
      } catch (error) {
        console.warn('Failed to clear saved test results:', error);
      }
    }
  };

  /**
   * Відправити рішення на сервер
   */
  const submitSolution = async (testData: TestResults) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, skipping submission');
        setError('Будь ласка, увійдіть в систему для відправки рішення');
        return;
      }

      console.log('Submitting solution:', {
        taskId,
        language: selectedLanguage,
        tournamentId,
        score: testData.score,
        testResultsSize: testData.test_cases?.length
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          tournament_id: tournamentId || null,
          test_results: testData,
          score: testData.score,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Solution submitted successfully:', data);
        // Call callback to update score
        onSuccessfulSubmit?.();
      } else {
        console.error('Failed to submit solution:', data);
        setError(`Помилка відправки рішення: ${data.message}`);
      }
    } catch (err) {
      console.error('Error submitting solution:', err);
      setError('Не вдалося відправити рішення. Перевірте з\'єднання з сервером.');
    }
  };

  /**
   * Отримати колір статусу виконання
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'bg-green-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      case 'terminated':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  /**
   * Отримати текст статусу
   */
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'success':
        return 'Успішно';
      case 'error':
        return 'Помилка';
      case 'terminated':
        return 'Перервано';
      default:
        return 'Невідомо';
    }
  };

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden border-0">
        <CardContent className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4">
          <ResizablePanelGroup direction="vertical" className="flex-1 gap-2">
            {/* Верхня панель: редактор коду */}
            <ResizablePanel defaultSize={50} minSize={20} maxSize={80}>
              <div className="h-full p-1">
                <div className="h-full rounded-lg overflow-hidden relative">
                <CodeMirror
                  value={code}
                  height="100%"
                  theme={oneDark}
                  extensions={[getCodeMirrorExtension(selectedLanguage), EditorView.theme({
                    '&': {
                      fontSize: isMobile ? '12px' : '14px',
                    },
                    '.cm-content': {
                      padding: isMobile ? '8px' : '12px',
                      maxWidth: isMobile ? '100%' : 'none',
                      // overflowX: isMobile ? 'scroll' : 'auto',
                      wordBreak: isMobile ? 'break-all' : 'normal',
                      whiteSpace: isMobile ? 'pre-wrap' : 'pre',
                    },
                    '.cm-line': {
                      lineHeight: '1.5',
                    },
                    // Touch-friendly scrolling
                    '.cm-scroller': {
                      // overflowX: isMobile ? 'scroll' : 'auto',
                      scrollbarWidth: 'auto',
                      maxWidth: isMobile ? '100%' : 'none',
                    },
                    // Better mobile selection
                    '.cm-selectionMatch': {
                      backgroundColor: '#264f78',
                    },
                    // Mobile-friendly cursor
                    '.cm-cursor': {
                      width: isMobile ? '3px' : '2px',
                    }
                  })]}
                  onChange={(value) => setCode(value)}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightSelectionMatches: true,
                  }}
                />
                {/* Кнопки запуску в редакторі */}
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button
                    onClick={executeCode}
                    disabled={isLoading || isTestsLoading}
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-2 h-8 bg-black/80 border-gray-600 hover:bg-black/90 hover:text-primary"
                    size="sm"
                  >
                    <Play className="w-4 h-4" />
                    RUN
                  </Button>
                  <Button
                    onClick={runAllTestsAndSubmit}
                    disabled={isLoading || isTestsLoading}
                    className="flex items-center gap-2 px-3 py-2 h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="sm"
                  >
                    <Play className="w-4 h-4" />
                    Надіслати
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="px-3 py-2 h-8 bg-black/80 border-gray-600 hover:bg-black/90 hover:text-primary">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <div className="p-2 space-y-3">
                        {/* Вибір мови */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Мова програмування</label>
                          <Select value={`${selectedLanguage}|${selectedVersion}`} onValueChange={(value) => {
                            const [lang, version] = value.split('|');
                            handleLanguageChange(lang, version);
                          }}>
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Мова..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLanguages
                                .filter((lang, index, self) => 
                                  self.findIndex(l => l.name === lang.name) === index
                                )
                                .map((lang) => (
                                  <div key={`lang-group-${lang.name}`}>
                                    {lang.versions.map((version) => (
                                      <SelectItem key={`${lang.name}|${version}`} value={`${lang.name}|${version}`}>
                                        {lang.name.charAt(0).toUpperCase() + lang.name.slice(1)} {version}
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Ліміт часу */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ліміт часу</label>
                          <Select value={timeLimit.toString()} onValueChange={(value) => setTimeLimit(Number(value))}>
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="time-5000" value="5000">5с...</SelectItem>
                              <SelectItem key="time-10000" value="10000">10с...</SelectItem>
                              <SelectItem key="time-30000" value="30000">30с...</SelectItem>
                              <SelectItem key="time-60000" value="60000">60с...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Ліміт пам'яті */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ліміт пам'яті</label>
                          <Select value={memoryLimit.toString()} onValueChange={(value) => setMemoryLimit(Number(value))}>
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="mem-64" value="64">64MB...</SelectItem>
                              <SelectItem key="mem-128" value="128">128MB...</SelectItem>
                              <SelectItem key="mem-256" value="256">256MB...</SelectItem>
                              <SelectItem key="mem-512" value="512">512MB...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            </ResizablePanel>

            {/* Горизонтальний сплітер */}
            <ResizableHandle withHandle />

            {/* Нижня панель: таби для входних даних, результатів та тестів */}
            <ResizablePanel defaultSize={50} minSize={20} maxSize={80}>
              <div className="h-full p-1">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                  <TabsTrigger value="input">Вхід</TabsTrigger>
                  <TabsTrigger value="output">Виконання</TabsTrigger>
                  <TabsTrigger value="tests">Тести</TabsTrigger>
                </TabsList>

                {/* Вхідні дані */}
                <TabsContent value="input" className="flex-1 overflow-hidden mt-4">
                  <div className="h-full flex flex-col space-y-2">
                    
                    <div className="flex-1 min-h-0 max-h-28">
                      <Textarea
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        placeholder="Введіть вхідні дані для програми..."
                        className="font-mono h-full resize-none border-primary"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Результат виконання */}
                <TabsContent value="output" className="flex-1 overflow-hidden mt-4 space-y-4">
                  <div className="overflow-auto">
                  {/* Повідомлення про помилку */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {result && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(result.status)}>
                          {getStatusText(result.status)}
                        </Badge>
                        <Badge variant="outline" className="bg-gray-900 text-gray-100 border-gray-700">
                          {result.execution_time_ms}ms
                        </Badge>
                        <Badge variant="outline" className="bg-gray-900 text-gray-100 border-gray-700">
                          {result.memory_used_mb}MB
                        </Badge>
                      </div>

                      {/* Stdout */}
                      {result.output.stdout && (
                        <div>
                          <h4 className="font-medium mb-2">Вивід (stdout):</h4>
                          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono max-h-48 overflow-auto">
                            {result.output.stdout}
                          </pre>
                        </div>
                      )}

                      {/* Stderr */}
                      {result.output.stderr && (
                        <div>
                          <h4 className="font-medium mb-2 text-red-600">Помилки (stderr):</h4>
                          <pre className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm font-mono max-h-48 overflow-auto text-red-700 dark:text-red-300">
                            {result.output.stderr}
                          </pre>
                        </div>
                      )}

                      {/* Compile output */}
                      {result.output.compile_output && (
                        <div>
                          <h4 className="font-medium mb-2 text-yellow-600">Вивід компіляції:</h4>
                          <pre className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-sm font-mono max-h-48 overflow-auto text-yellow-700 dark:text-yellow-300">
                            {result.output.compile_output}
                          </pre>
                        </div>
                      )}

                      {/* Детальна інформація */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Код виходу:</span>
                          <div className="font-mono">{result.output.exit_code}</div>
                        </div>
                        <div>
                          <span className="font-medium">Час виконання:</span>
                          <div className="font-mono">{result.output.time}s</div>
                        </div>
                        <div>
                          <span className="font-medium">Пам'ять:</span>
                          <div className="font-mono">{(result.output.memory / 1024 / 1024).toFixed(2)}MB</div>
                        </div>
                        <div>
                          <span className="font-medium">Сигнал:</span>
                          <div className="font-mono">{result.output.signal || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!result && !error && (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Terminal className="w-10 h-12 mx-auto mb-2 opacity-50" />
                        <p>Натисніть кнопку RUN для виконання коду з вхідними даними</p>
                        <p className="text-sm mt-1">або Надіслати для виконання всіх тестів та відправки рішення</p>
                      </div>
                    </div>
                  )}
                  </div>
                </TabsContent>

                {/* Тести */}
                <TabsContent value="tests" className="flex-1 overflow-hidden mt-4">
                  {isTestsLoading ? (
                    <TestResultsDisplay results={null} isLoading={true} />
                  ) : testResults ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Результати тестів</h3>
                        <Button
                          onClick={clearSavedResults}
                          variant="outline"
                          size="sm"
                          className="text-sm"
                        >
                          {isMobile ? <RefreshCw className="w-4 h-4" /> : "Очистити результати"}
                        </Button>
                      </div>
                      <div className="overflow-auto max-h-64">
                        <TestResultsDisplay results={testResults} isLoading={false} />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Code className="w-10 h-12 mx-auto mb-4 opacity-50" />
                        <p>Натисніть кнопку Надіслати для виконання тестів та відправки рішення</p>
                        <p className="text-sm mt-2">RUN виконує код з вхідними даними у вкладці "Виконання"</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </CardContent>
      </Card>
    </div>
  );
};
