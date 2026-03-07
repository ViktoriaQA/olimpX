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
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {results.passed_tests}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Пройдено
            </div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {results.failed_tests}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              Провалено
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {results.total_tests}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Всього тестів
            </div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {successRate}%
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
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
              className={`border rounded-lg p-4 ${
                testCase.passed 
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testCase.passed)}
                  <span className="font-medium">Тест {index + 1}: {testCase.name}</span>
                  <Badge variant={getStatusBadgeVariant(testCase.passed)}>
                    {getStatusText(testCase.passed)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatTime(testCase.execution_time)}</span>
                  <span>{formatMemory(testCase.memory_usage)}</span>
                </div>
              </div>

              {/* Вхідні дані */}
              <div className="mb-2">
                <span className="text-sm font-medium">Вхідні дані:</span>
                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded mt-1 overflow-auto">
                  {testCase.input || '(пусто)'}
                </pre>
              </div>

              {/* Очікуваний результат */}
              <div className="mb-2">
                <span className="text-sm font-medium">Очікуваний результат:</span>
                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded mt-1 overflow-auto">
                  {testCase.expected_output || '(пусто)'}
                </pre>
              </div>

              {/* Фактичний результат */}
              {testCase.actual_output !== undefined && (
                <div className="mb-2">
                  <span className="text-sm font-medium">Фактичний результат:</span>
                  <pre className={`text-xs p-2 rounded mt-1 overflow-auto ${
                    testCase.passed 
                      ? 'bg-white dark:bg-gray-800' 
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  }`}>
                    {testCase.actual_output || '(пусто)'}
                  </pre>
                </div>
              )}

              {/* Помилка */}
              {testCase.error && (
                <div>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Помилка:</span>
                  <pre className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-2 rounded mt-1 overflow-auto">
                    {testCase.error}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Підсумок */}
        {results.failed_tests === 0 && results.total_tests > 0 && (
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
              Всі тести пройдено!
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              Ваш код успішно пройшов усі {results.total_tests} тестів
            </p>
          </div>
        )}

        {results.failed_tests > 0 && (
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <XCircle className="w-8 h-8 mx-auto mb-2 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
              Деякі тести провалено
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">
              {results.failed_tests} з {results.total_tests} тестів не пройдено
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
