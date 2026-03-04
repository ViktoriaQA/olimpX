import React, { useRef, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Play, Code, Terminal } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";

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

/**
 * Компонент редактора коду з підтримкою Monaco Editor
 * Підтримує JavaScript, TypeScript, Python та C++
 */
export const CodeEditor: React.FC = () => {
  const editorRef = useRef<any>(null);
  const isMobile = useIsMobile();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [code, setCode] = useState<string>('// Ваш JavaScript код\nconsole.log("Hello, World!");');
  const [stdin, setStdin] = useState<string>('');
  const [result, setResult] = useState<ExecutionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [error, setError] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState<number>(10000);
  const [memoryLimit, setMemoryLimit] = useState<number>(128);

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
   * Отримати Monaco мову для вибраної мови програмування
   */
  const getMonacoLanguage = (language: string): string => {
    const monacoLanguages: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      python: 'python',
      cpp: 'cpp',
    };
    return monacoLanguages[language] || 'plaintext';
  };

  /**
   * Завантажити список доступних мов
   */
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await fetch('/api/code-execution/languages');
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
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setCode(codeTemplates[language] || '');
    setResult(null);
    setError('');

    // Встановити версію для нової мови
    const langInfo = availableLanguages.find(lang => lang.name === language);
    if (langInfo && langInfo.versions.length > 0) {
      setSelectedVersion(langInfo.versions[langInfo.versions.length - 1]);
    }
  };

  /**
   * Обробник монтування редактора
   */
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Налаштування теми та розміру шрифту
    monaco.editor.setTheme('vs-dark');
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });
  };

  /**
   * Виконати код
   */
  const executeCode = async () => {
    if (!code.trim()) {
      setError('Будь ласка, введіть код для виконання');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/code-execution/execute', {
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
   * Отримати колір статусу виконання
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'terminated':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
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
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Редактор коду
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Панель налаштувань */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-end">
            <div className="w-full sm:flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">Мова програмування</label>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть мову" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages
                    .filter((lang, index, self) => 
                      self.findIndex(l => l.name === lang.name) === index
                    )
                    .map((lang) => (
                      <SelectItem key={`lang-${lang.name}`} value={lang.name}>
                        {lang.name.charAt(0).toUpperCase() + lang.name.slice(1)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">Версія</label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть версію" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages
                    .find(lang => lang.name === selectedLanguage)
                    ?.versions.map((version) => (
                      <SelectItem key={`version-${selectedLanguage}-${version}`} value={version}>
                        {version}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-auto flex gap-2">
              <Button
                onClick={executeCode}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isLoading ? 'Виконання...' : 'Запустити'}
              </Button>
            </div>
          </div>

          {/* Налаштування обмежень */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-end">
            <div className="w-full sm:flex-1">
              <label className="block text-sm font-medium mb-2">Обмеження часу (мс)</label>
              <Select value={timeLimit.toString()} onValueChange={(value) => setTimeLimit(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="time-5000" value="5000">5 секунд</SelectItem>
                  <SelectItem key="time-10000" value="10000">10 секунд</SelectItem>
                  <SelectItem key="time-30000" value="30000">30 секунд</SelectItem>
                  <SelectItem key="time-60000" value="60000">60 секунд</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:flex-1">
              <label className="block text-sm font-medium mb-2">Обмеження пам'яті (MB)</label>
              <Select value={memoryLimit.toString()} onValueChange={(value) => setMemoryLimit(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="mem-64" value="64">64 MB</SelectItem>
                  <SelectItem key="mem-128" value="128">128 MB</SelectItem>
                  <SelectItem key="mem-256" value="256">256 MB</SelectItem>
                  <SelectItem key="mem-512" value="512">512 MB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Редактор коду */}
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height={isMobile ? "280px" : "400px"}
              language={getMonacoLanguage(selectedLanguage)}
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
              }}
            />
          </div>

          {/* Вхідні дані */}
          <div>
            <label className="block text-sm font-medium mb-2">Вхідні дані (stdin)</label>
            <Textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Введіть вхідні дані для програми..."
              rows={3}
            />
          </div>

          {/* Повідомлення про помилку */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Результат виконання */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Результат виконання
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(result.status)}>
                  {getStatusText(result.status)}
                </Badge>
                <Badge variant="outline">
                  {result.execution_time_ms}ms
                </Badge>
                <Badge variant="outline">
                  {result.memory_used_mb}MB
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stdout */}
            {result.output.stdout && (
              <div>
                <h4 className="font-medium mb-2">Вивід (stdout):</h4>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono overflow-auto">
                  {result.output.stdout}
                </pre>
              </div>
            )}

            {/* Stderr */}
            {result.output.stderr && (
              <div>
                <h4 className="font-medium mb-2 text-red-600">Помилки (stderr):</h4>
                <pre className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm font-mono overflow-auto text-red-700 dark:text-red-300">
                  {result.output.stderr}
                </pre>
              </div>
            )}

            {/* Compile output */}
            {result.output.compile_output && (
              <div>
                <h4 className="font-medium mb-2 text-yellow-600">Вивід компіляції:</h4>
                <pre className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-sm font-mono overflow-auto text-yellow-700 dark:text-yellow-300">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};
