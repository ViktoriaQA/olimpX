import axios, { AxiosInstance } from 'axios';
import { CodeExecutionService, CodeExecutionRequest, CodeExecutionResult, LanguageInfo } from './codeExecutionService';

/**
 * OnlineCompiler API відповідь
 */
interface OnlineCompilerResponse {
  output: string;
  error: string;
  status: string;
  exit_code: number;
  signal: string | null;
  time: string;
  total: string;
  memory: string;
}

/**
 * OnlineCompiler конфігурація
 */
interface OnlineCompilerConfig {
  api_key: string;
  base_url: string;
}

/**
 * Сервіс для виконання коду через MyCompiler API
 */
export class OnlineCompilerService implements CodeExecutionService {
  name = 'MyCompiler';
  priority = 4; // Нижчий пріоритет
  is_available = true;
  
  private axiosInstance: AxiosInstance;
  private config: OnlineCompilerConfig;
  private readonly rate_limit_delay = 2000; // 2 секунди між запитами
  private last_request_time = 0;

  // Мапінг мов для OnlineCompiler
  private readonly language_map: Record<string, string> = {
    'python': 'python-3.14',
    'javascript': 'nodejs-18',
    'typescript': 'typescript-deno',
    'go': 'go-1.26',
    'java': 'openjdk-25',
    'cpp': 'g++-15',
    'c': 'gcc-15',
    'c++': 'g++-15',
    'ruby': 'ruby-4.0',
    'php': 'php-8.5',
    'rust': 'rust-1.93',
    'csharp': 'dotnet-csharp-9',
    'fsharp': 'dotnet-fsharp-9',
    'haskell': 'haskell-9.12'
  };

  constructor(config?: Partial<OnlineCompilerConfig>) {
    this.config = {
      api_key: config?.api_key || process.env.MYCOMPILER_API_KEY || '',
      base_url: config?.base_url || 'https://api.onlinecompiler.io'
    };

    if (!this.config.api_key) {
      console.warn('⚠️ MyCompiler API key not provided. Service will be disabled.');
      this.is_available = false;
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.base_url,
      timeout: 35000, // Трохи більше через можливі затримки
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.config.api_key
      },
    });

    console.log(`🔧 MyCompiler Service initialized (available: ${this.is_available})`);
  }

  /**
   * Отримати список підтримуваних мов
   */
  async getSupportedLanguages(): Promise<LanguageInfo[]> {
    const supportedLanguages = Object.keys(this.language_map);
    
    return supportedLanguages.map(lang => ({
      name: lang,
      versions: ['latest'], // OnlineCompiler не надає версії в API
      supported_services: [this.name]
    }));
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

    const compiler = this.language_map[request.language.toLowerCase()];
    if (!compiler) {
      throw new Error(`Language ${request.language} is not supported by MyCompiler`);
    }

    const payload = {
      compiler: compiler,
      code: request.code,
      input: request.stdin || '',
      timeout: Math.min((request.time_limit || 10000) / 1000, 30), // Max 30 секунд
      memory: Math.min((request.memory_limit || 128 * 1024 * 1024) / 1024 / 1024, 0.5) // Max 512MB
    };

    try {
      console.log(`🔧 Executing ${request.language} code with MyCompiler (${compiler})`);
      
      const response = await this.axiosInstance.post<OnlineCompilerResponse>('/api/run-code/', payload);
      
      const result = response.data;
      
      // Визначаємо статус виконання
      let status: CodeExecutionResult['status'] = 'success';
      
      if (result.status !== 'success') {
        status = 'error';
      } else if (result.exit_code !== 0) {
        status = 'error';
      }

      // Конвертуємо час з рядка в число
      const executionTime = parseFloat(result.time) || 0;
      const totalTime = parseFloat(result.total) || 0;
      
      // Конвертуємо пам'ять з рядка в число (в байтах)
      const memory = parseInt(result.memory) || 0;

      return {
        language: request.language,
        version: 'latest',
        output: {
          exit_code: result.exit_code,
          stdout: result.output || '',
          stderr: result.error || '',
          time: executionTime,
          memory: memory,
          signal: result.signal || undefined,
          compile_output: undefined
        },
        execution_time_ms: Math.round(totalTime * 1000),
        memory_used_mb: Math.round(memory / 1024 / 1024),
        status,
        service: this.name,
        request_time_ms: 0 // Буде встановлено в менеджері
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        
        // Перевіряємо, чи це помилка ліміту
        if (error.response?.status === 429) {
          throw new Error(`MyCompiler API rate limit exceeded: ${message}`);
        }
        
        // Перевіряємо, чи це помилка авторизації
        if (error.response?.status === 401) {
          throw new Error(`MyCompiler API authorization failed: ${message}`);
        }
        
        throw new Error(`MyCompiler API error: ${message}`);
      }
      throw new Error(`MyCompiler execution failed: ${error}`);
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
      console.error('MyCompiler health check failed:', error);
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
}
