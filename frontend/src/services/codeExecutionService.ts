/**
 * Базовий URL для API запитів
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Допоміжна функція для виконання HTTP запитів
 */
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T }> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return { data: await response.json() };
};

/**
 * Інтерфейс для мови програмування
 */
export interface Language {
  name: string;
  versions: string[];
}

/**
 * Інтерфейс для запиту на виконання коду
 */
export interface ExecutionRequest {
  language: string;
  version?: string;
  code: string;
  stdin?: string;
  time_limit?: number;
  memory_limit?: number;
}

/**
 * Інтерфейс для результату виконання коду
 */
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  time: number;
  memory: number;
  signal: string | null;
  compile_output?: string;
}

/**
 * Інтерфейс для відповіді API виконання коду
 */
export interface ExecutionResponse {
  language: string;
  version: string;
  output: ExecutionResult;
  execution_time_ms: number;
  memory_used_mb: number;
  status: string;
}

/**
 * Інтерфейс для відповіді API
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
}

/**
 * Сервіс для роботи з API виконання коду
 */
export class CodeExecutionService {
  /**
   * Отримати список доступних мов програмування
   * @returns Promise з масивом доступних мов
   */
  static async getLanguages(): Promise<Language[]> {
    try {
      const response = await apiRequest<ApiResponse<Language[]>>('/api/code-execution/languages');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Не вдалося отримати список мов');
      }
    } catch (error) {
      console.error('Помилка отримання мов:', error);
      if (error instanceof Error) {
        throw new Error(error.message || 'Помилка зєднання з сервером');
      }
      throw new Error('Невідома помилка при отриманні списку мов');
    }
  }

  /**
   * Отримати інформацію про конкретну мову
   * @param language Назва мови
   * @returns Promise з інформацією про мову
   */
  static async getLanguageInfo(language: string): Promise<{
    language: string;
    supported: boolean;
    recommended_version: string | null;
  }> {
    try {
      const response = await apiRequest<ApiResponse<{
        language: string;
        supported: boolean;
        recommended_version: string | null;
      }>>(`/api/code-execution/languages/${language}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Не вдалося отримати інформацію про мову');
      }
    } catch (error) {
      console.error('Помилка отримання інформації про мову:', error);
      if (error instanceof Error) {
        throw new Error(error.message || 'Помилка зєднання з сервером');
      }
      throw new Error('Невідома помилка при отриманні інформації про мову');
    }
  }

  /**
   * Виконати код
   * @param request Параметри виконання коду
   * @returns Promise з результатом виконання
   */
  static async executeCode(request: ExecutionRequest): Promise<ExecutionResponse> {
    try {
      const response = await apiRequest<ApiResponse<ExecutionResponse>>('/api/code-execution/execute', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Не вдалося виконати код');
      }
    } catch (error) {
      console.error('Помилка виконання коду:', error);
      
      if (error instanceof Error) {
        // Спроба розпарсити помилку валідації
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const formattedErrors = errorData.errors.map((err: any) => err.msg).join(', ');
            throw new Error(`Помилка валідації: ${formattedErrors}`);
          }
        } catch {
          // Якщо це не JSON, використовуємо оригінальне повідомлення
        }
        
        throw new Error(error.message || 'Помилка зєднання з сервером');
      }
      
      throw new Error('Невідома помилка при виконанні коду');
    }
  }

  /**
   * Перевірити статус сервера
   * @returns Promise з інформацією про статус сервера
   */
  static async checkServerHealth(): Promise<{
    status: string;
    timestamp: string;
    frontend: string;
  }> {
    try {
      const response = await apiRequest<any>('/health');
      return response.data;
    } catch (error) {
      console.error('Помилка перевірки здоровя сервера:', error);
      throw new Error('Сервер недоступний');
    }
  }

  /**
   * Отримати рекомендовану версію для мови
   * @param language Назва мови
   * @returns Promise з версією або null
   */
  static async getRecommendedVersion(language: string): Promise<string | null> {
    try {
      const languageInfo = await this.getLanguageInfo(language);
      return languageInfo.recommended_version;
    } catch (error) {
      console.error('Помилка отримання рекомендованої версії:', error);
      return null;
    }
  }

  /**
   * Валідація коду перед відправкою
   * @param code Код для перевірки
   * @param language Мова програмування
   * @returns Результат валідації
   */
  static validateCode(code: string, language: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Базова валідація
    if (!code || code.trim().length === 0) {
      errors.push('Код не може бути порожнім');
    }

    if (code.length > 50000) {
      errors.push('Розмір коду не повинен перевищувати 50000 символів');
    }

    // Специфічна валідація для різних мов
    switch (language.toLowerCase()) {
      case 'javascript':
        if (!code.includes('console.log') && !code.includes('return')) {
          errors.push('JavaScript код повинен містити console.log або return для виводу результату');
        }
        break;
      
      case 'python':
        if (!code.includes('print(') && !code.includes('return')) {
          errors.push('Python код повинен містити print() або return для виводу результату');
        }
        break;
      
      case 'cpp':
        if (!code.includes('#include') || !code.includes('main(')) {
          errors.push('C++ код повинен містити #include та функцію main()');
        }
        break;
      
      case 'typescript':
        if (!code.includes('console.log') && !code.includes('return')) {
          errors.push('TypeScript код повинен містити console.log або return для виводу результату');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Форматувати результат виконання для відображення
   * @param result Результат виконання
   * @return Відформатований результат
   */
  static formatExecutionResult(result: ExecutionResponse): {
    hasOutput: boolean;
    hasErrors: boolean;
    hasCompileOutput: boolean;
    outputSummary: string;
  } {
    const hasOutput = result.output.stdout.trim().length > 0;
    const hasErrors = result.output.stderr.trim().length > 0;
    const hasCompileOutput = result.output.compile_output && result.output.compile_output.trim().length > 0;

    let outputSummary = '';
    if (hasOutput) {
      outputSummary += `Вивід: ${result.output.stdout.split('\n').length} рядків`;
    }
    if (hasErrors) {
      outputSummary += `${outputSummary ? ', ' : ''}Помилки: ${result.output.stderr.split('\n').length} рядків`;
    }
    if (hasCompileOutput) {
      outputSummary += `${outputSummary ? ', ' : ''}Компіляція: ${result.output.compile_output.split('\n').length} рядків`;
    }

    return {
      hasOutput,
      hasErrors,
      hasCompileOutput,
      outputSummary: outputSummary || 'Немає виводу',
    };
  }
}

// Експорт сервісу за замовчуванням для зручності
export default CodeExecutionService;
