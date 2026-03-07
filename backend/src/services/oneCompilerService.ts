import axios, { AxiosInstance } from 'axios';
import { CodeExecutionService, CodeExecutionRequest, CodeExecutionResult, LanguageInfo } from './codeExecutionService';

/**
 * OneCompiler API відповідь
 */
interface OneCompilerResponse {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTime?: number;
  memory?: number;
  compile?: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
  };
  error?: string;
}

/**
 * OneCompiler конфігурація
 */
interface OneCompilerConfig {
  api_key: string;
  base_url: string;
}

/**
 * Сервіс для виконання коду через OneCompiler API
 */
export class OneCompilerService implements CodeExecutionService {
  name = 'OneCompiler';
  priority = 2; // Середній пріоритет
  is_available = true;
  
  private axiosInstance: AxiosInstance;
  private config: OneCompilerConfig;
  private readonly rate_limit_delay = 2000; // 2 секунди між запитами
  private last_request_time = 0;

  // Мапінг мов для OneCompiler
  private readonly language_map: Record<string, { language: string; version?: string }> = {
    'python': { language: 'python', version: '3.10.0' },
    'javascript': { language: 'javascript', version: '18.15.0' },
    'typescript': { language: 'typescript', version: '5.0.3' },
    'go': { language: 'go', version: '1.20.0' },
    'java': { language: 'java', version: '17.0.0' },
    'cpp': { language: 'cpp', version: 'gcc-9.3.0' },
    'c': { language: 'c', version: 'gcc-9.3.0' },
    'c++': { language: 'cpp', version: 'gcc-9.3.0' },
    'ruby': { language: 'ruby', version: '3.2.0' },
    'php': { language: 'php', version: '8.2.0' },
    'rust': { language: 'rust', version: '1.70.0' },
    'csharp': { language: 'csharp', version: '6.0.0' }
  };

  constructor(config?: Partial<OneCompilerConfig>) {
    this.config = {
      api_key: config?.api_key || process.env.ONECOMPILER_API_KEY || '',
      base_url: config?.base_url || 'https://api.onecompiler.com'
    };

    if (!this.config.api_key) {
      console.warn('⚠️ OneCompiler API key not provided. Service will be disabled.');
      this.is_available = false;
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.base_url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.api_key}`
      },
    });

    console.log(`🔧 OneCompiler Service initialized (available: ${this.is_available})`);
  }

  /**
   * Отримати список підтримуваних мов
   */
  async getSupportedLanguages(): Promise<LanguageInfo[]> {
    const supportedLanguages = Object.keys(this.language_map);
    
    return supportedLanguages.map(lang => {
      const config = this.language_map[lang];
      return {
        name: lang,
        versions: config.version ? [config.version] : ['latest'],
        supported_services: [this.name]
      };
    });
  }

  /**
   * Перевірити, чи підтримується мова
   */
  async isLanguageSupported(language: string): Promise<boolean> {
    return language.toLowerCase() in this.language_map;
  }

  /**
   * Виконати код
   */
  async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // Rate limiting
    await this.rateLimitDelay();

    const languageConfig = this.language_map[request.language.toLowerCase()];
    if (!languageConfig) {
      throw new Error(`Language ${request.language} is not supported by OneCompiler`);
    }

    const payload = {
      language: languageConfig.language,
      version: languageConfig.version,
      files: [
        {
          name: this.getFileName(request.language),
          content: request.code
        }
      ],
      stdin: request.stdin || '',
      compileTimeout: 10,
      runTimeout: Math.min((request.time_limit || 10000) / 1000, 10), // Max 10 секунд
      compileMemoryLimit: Math.min((request.memory_limit || 128 * 1024 * 1024) / 1024 / 1024, 1), // Max 1GB
      runMemoryLimit: Math.min((request.memory_limit || 128 * 1024 * 1024) / 1024 / 1024, 1)
    };

    try {
      console.log(`🔧 Executing ${request.language} code with OneCompiler`);
      
      const response = await this.axiosInstance.post<OneCompilerResponse>('/execute', payload);
      
      const result = response.data;
      
      // Визначаємо статус виконання
      let status: CodeExecutionResult['status'] = 'success';
      let exit_code = 0;
      let stdout = '';
      let stderr = '';
      let compile_output = '';
      
      // Перевіряємо компіляцію
      if (result.compile) {
        if (result.compile.exitCode !== 0) {
          status = 'error';
          exit_code = result.compile.exitCode || 1;
          compile_output = result.compile.stderr || result.compile.stdout || '';
        }
      }
      
      // Перевіряємо виконання
      if (result.exitCode !== undefined && result.exitCode !== 0) {
        status = 'error';
        exit_code = result.exitCode;
      }
      
      stdout = result.stdout || '';
      stderr = result.stderr || '';
      
      // Якщо є помилка в API
      if (result.error) {
        status = 'error';
        stderr += (stderr ? '\n' : '') + result.error;
      }

      return {
        language: request.language,
        version: languageConfig.version || 'latest',
        output: {
          exit_code,
          stdout,
          stderr,
          time: (result.executionTime || 0) / 1000, // Конвертуємо з мс в секунди
          memory: (result.memory || 0) * 1024 * 1024, // Конвертуємо з MB в байти
          signal: undefined,
          compile_output: compile_output || undefined
        },
        execution_time_ms: result.executionTime || 0,
        memory_used_mb: Math.round(result.memory || 0),
        status,
        service: this.name,
        request_time_ms: 0 // Буде встановлено в менеджері
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`OneCompiler API error: ${message}`);
      }
      throw new Error(`OneCompiler execution failed: ${error}`);
    }
  }

  /**
   * Перевірити здоров'я сервісу
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Виконуємо простий тест
      const testRequest: CodeExecutionRequest = {
        language: 'python',
        code: 'print("Hello World")'
      };

      const result = await this.executeCode(testRequest);
      return result.status === 'success' && result.output.stdout.includes('Hello World');
    } catch (error) {
      console.error('OneCompiler health check failed:', error);
      return false;
    }
  }

  /**
   * Затримка для rate limiting
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const time_since_last = now - this.last_request_time;
    
    if (time_since_last < this.rate_limit_delay) {
      const delay = this.rate_limit_delay - time_since_last;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.last_request_time = Date.now();
  }

  /**
   * Отримати ім'я файлу для мови
   */
  private getFileName(language: string): string {
    const extensions: Record<string, string> = {
      'python': 'main.py',
      'javascript': 'main.js',
      'typescript': 'main.ts',
      'go': 'main.go',
      'java': 'Main.java',
      'cpp': 'main.cpp',
      'c': 'main.c',
      'c++': 'main.cpp',
      'ruby': 'main.rb',
      'php': 'main.php',
      'rust': 'main.rs',
      'csharp': 'Main.cs'
    };

    return extensions[language.toLowerCase()] || 'main.txt';
  }
}
