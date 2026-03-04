import axios, { AxiosInstance } from 'axios';

/**
 * Інтерфейс для запиту на виконання коду
 */
export interface ExecutionRequest {
  /** Мова програмування */
  language: string;
  /** Версія мови */
  version: string;
  /** Код для виконання */
  code: string;
  /** Вхідні дані для stdin */
  stdin?: string;
  /** Обмеження за часом у мс */
  time_limit?: number;
  /** Обмеження по пам'яті у байтах */
  memory_limit?: number;
}

/**
 * Інтерфейс для відповіді від Piston API
 */
export interface ExecutionResponse {
  /** Мова виконання */
  language: string;
  /** Версія мови */
  version: string;
  /** Результат виконання */
  run: {
    /** Код виходу */
    exit_code: number;
    /** Stdout вивід */
    stdout: string;
    /** Stderr вивід */
    stderr: string;
    /** Час виконання у секундах */
    time: number;
    /** Використана пам'ять у байтах */
    memory: number;
    /** Сигнал завершення */
    signal: string | null;
    /** Статус компіляції */
    compile_output?: string;
  };
}

/**
 * Інтерфейс для інформації про доступну мову
 */
export interface LanguageInfo {
  /** Назва мови */
  name: string;
  /** Доступні версії */
  versions: string[];
}

/**
 * Сервіс для взаємодії з Piston API
 * Забезпечує безпечне виконання коду в ізольованому середовищі
 */
export class PistonService {
  private axiosInstance: AxiosInstance;
  private readonly baseUrl: string;

  /**
   * Створює екземпляр сервісу Piston
   * @param pistonUrl URL Piston API (за замовчуванням https://emkc.org/api/v2/piston)
   */
  constructor(pistonUrl: string = 'https://emkc.org/api/v2/piston') {
    this.baseUrl = pistonUrl;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 секунд таймаут
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Отримати список доступних мов програмування
   * @returns Promise з масивом доступних мов
   */
  async getAvailableLanguages(): Promise<LanguageInfo[]> {
    try {
      const response = await this.axiosInstance.get('/runtimes');
      return response.data.map((runtime: any) => ({
        name: runtime.language,
        versions: [runtime.version],
      }));
    } catch (error) {
      console.error('Помилка при отриманні списку мов:', error);
      throw new Error('Не вдалося отримати список доступних мов');
    }
  }

  /**
   * Виконати код
   * @param request Параметри виконання коду
   * @returns Promise з результатом виконання
   */
  async executeCode(request: ExecutionRequest): Promise<ExecutionResponse> {
    try {
      // Валідація вхідних даних
      this.validateExecutionRequest(request);

      const payload = {
        language: request.language,
        version: request.version,
        files: [
          {
            name: this.getFileName(request.language),
            content: request.code,
          },
        ],
        stdin: request.stdin || '',
        compile_timeout: 10, // 10 секунд на компіляцію
        run_timeout: request.time_limit ? request.time_limit / 1000 : 3, // 3 секунди за замовчуванням
        compile_memory_limit: request.memory_limit ? request.memory_limit / 1024 / 1024 : -1, // MB
        run_memory_limit: request.memory_limit ? request.memory_limit / 1024 / 1024 : -1, // MB
      };

      const response = await this.axiosInstance.post('/execute', payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Помилка виконання коду: ${message}`);
      }
      console.error('Помилка виконання коду:', error);
      throw new Error('Не вдалося виконати код');
    }
  }

  /**
   * Перевірити, чи підтримується мова
   * @param language Назва мови
   * @param version Версія мови
   * @returns Promise з boolean результатом
   */
  async isLanguageSupported(language: string, version?: string): Promise<boolean> {
    try {
      const languages = await this.getAvailableLanguages();
      const langInfo = languages.find(lang => lang.name.toLowerCase() === language.toLowerCase());
      
      if (!langInfo) {
        return false;
      }

      if (version) {
        return langInfo.versions.includes(version);
      }

      return true;
    } catch (error) {
      console.error('Помилка перевірки підтримки мови:', error);
      return false;
    }
  }

  /**
   * Отримати рекомендовану версію для мови
   * @param language Назва мови
   * @returns Promise з версією або null
   */
  async getRecommendedVersion(language: string): Promise<string | null> {
    try {
      const languages = await this.getAvailableLanguages();
      const langInfo = languages.find(lang => lang.name.toLowerCase() === language.toLowerCase());
      
      if (!langInfo || langInfo.versions.length === 0) {
        return null;
      }

      // Повертаємо останню (найсвіжішу) версію
      return langInfo.versions[langInfo.versions.length - 1];
    } catch (error) {
      console.error('Помилка отримання версії мови:', error);
      return null;
    }
  }

  /**
   * Валідація параметрів виконання
   * @param request Параметри виконання
   * @private
   */
  private validateExecutionRequest(request: ExecutionRequest): void {
    if (!request.language || request.language.trim() === '') {
      throw new Error('Мова програмування є обов\'язковою');
    }

    if (!request.version || request.version.trim() === '') {
      throw new Error('Версія мови є обов\'язковою');
    }

    if (!request.code || request.code.trim() === '') {
      throw new Error('Код для виконання є обов\'язковим');
    }

    if (request.time_limit && (request.time_limit < 100 || request.time_limit > 60000)) {
      throw new Error('Обмеження часу повинно бути між 100мс та 60с');
    }

    if (request.memory_limit && (request.memory_limit < 1024 * 1024 || request.memory_limit > 1024 * 1024 * 1024)) {
      throw new Error('Обмеження пам\'яті повинно бути між 1MB та 1GB');
    }
  }

  /**
   * Отримати ім'я файлу для мови
   * @param language Мова програмування
   * @returns Розширення файлу
   * @private
   */
  private getFileName(language: string): string {
    const extensions: Record<string, string> = {
      'javascript': 'main.js',
      'typescript': 'main.ts',
      'python': 'main.py',
      'cpp': 'main.cpp',
      'c++': 'main.cpp',
      'java': 'Main.java',
      'c': 'main.c',
      'go': 'main.go',
      'rust': 'main.rs',
      'php': 'main.php',
      'ruby': 'main.rb',
    };

    return extensions[language.toLowerCase()] || 'main.txt';
  }
}

// Експорт екземпляру сервісу за замовчуванням
export const pistonService = new PistonService();
