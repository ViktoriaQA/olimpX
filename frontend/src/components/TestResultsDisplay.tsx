import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

/**
 * Інтерфейс для тестового кейсу
 */
interface TestCase {
  id: string;
  name: string;
  input: string;
  expected_output: string;
  actual_output?: string;
  passed?: boolean;
  execution_time?: number;
  memory_usage?: number;
  error?: string;
}

/**
 * Інтерфейс для результатів тестів
 */
interface TestResults {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  total_time: number;
  test_cases: TestCase[];
}

/**
 * Компонент для відображення результатів тестування коду
 */
export const TestResultsDisplay: React.FC<{
  results: TestResults | null;
  isLoading?: boolean;
}> = ({ results, isLoading = false }) => {
  /**
   * Отримати іконку для статусу тесту
   */
  const getStatusIcon = (passed?: boolean) => {
    if (passed === undefined) return null;
    
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  /**
   * Отримати колір бейджа для статусу
   */
  const getStatusBadgeVariant = (passed?: boolean) => {
    if (passed === undefined) return 'secondary';
    return passed ? 'default' : 'destructive';
  };

  /**
   * Отримати текст статусу
   */
  const getStatusText = (passed?: boolean) => {
    if (passed === undefined) return 'Очікування';
    return passed ? 'Пройдено' : 'Провалено';
  };

  /**
   * Форматувати час виконання
   */
  const formatTime = (timeMs?: number) => {
    if (!timeMs) return 'N/A';
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(2)}s`;
  };

  /**
   * Форматувати використання пам'яті
   */
  const formatMemory = (memoryBytes?: number) => {
    if (!memoryBytes) return 'N/A';
    if (memoryBytes < 1024 * 1024) {
      return `${(memoryBytes / 1024).toFixed(1)}KB`;
    }
    return `${(memoryBytes / 1024 / 1024).toFixed(1)}MB`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 animate-spin" />
            Виконання тестів...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Тести виконуються...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return null;
  }

  const successRate = results.total_tests > 0 
    ? Math.round((results.passed_tests / results.total_tests) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Результати тестів
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={successRate === 100 ? 'default' : 'destructive'}>
              {successRate}% ({results.passed_tests}/{results.total_tests})
            </Badge>
            <Badge variant="outline">
              {formatTime(results.total_time)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Загальна статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-2xl font-bold text-primary">
              {results.passed_tests}
            </div>
            <div className="text-sm text-primary">
              Пройдено
            </div>
          </div>
          <div className="text-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-2xl font-bold text-destructive">
              {results.failed_tests}
            </div>
            <div className="text-sm text-destructive">
              Провалено
            </div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg border border-border">
            <div className="text-2xl font-bold text-foreground">
              {results.total_tests}
            </div>
            <div className="text-sm text-muted-foreground">
              Всього тестів
            </div>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-2xl font-bold text-primary">
              {successRate}%
            </div>
            <div className="text-sm text-primary">
              Успішність
            </div>
          </div>
        </div>

        {/* Детальні результати тестів */}
        <div className="space-y-3">
          <h4 className="font-medium">Детальні результати:</h4>
          {results.test_cases.map((testCase, index) => (
            <div
              key={testCase.id}
              className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                testCase.passed 
                  ? 'border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10' 
                  : 'border-destructive/20 bg-destructive/5 dark:border-destructive/30 dark:bg-destructive/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testCase.passed)}
                  <span className="font-medium text-foreground">{testCase.name}</span>
                  <Badge 
                    variant={testCase.passed ? "default" : "destructive"}
                    className="shrink-0"
                  >
                    {getStatusText(testCase.passed)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatTime(testCase.execution_time)}</span>
                  <span>{formatMemory(testCase.memory_usage)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Підсумок */}
        {results.failed_tests === 0 && results.total_tests > 0 && (
          <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="text-lg font-medium text-primary">
              Всі тести пройдено!
            </h3>
            <p className="text-sm text-primary/80">
              Ваш код успішно пройшов усі {results.total_tests} тестів
            </p>
          </div>
        )}

        {results.failed_tests > 0 && (
          <div className="text-center p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <h3 className="text-lg font-medium text-destructive">
              Деякі тести провалено
            </h3>
            <p className="text-sm text-destructive/80">
              {results.failed_tests} з {results.total_tests} тестів не пройдено
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
