import axios, { AxiosInstance } from 'axios';
import { CodeExecutionService, CodeExecutionRequest, CodeExecutionResult, LanguageInfo } from './codeExecutionService';

/**
 * JDoodle API відповідь
 */
interface JDoodleResponse {
  output: string;
  statusCode: number;
  memory: number;
  cpuTime: number;
  error?: string;
}

/**
 * JDoodle конфігурація
 */
interface JDoodleConfig {
  client_id: string;
  client_secret: string;
  base_url: string;
}

/**
 * Сервіс для виконання коду через JDoodle API
 */
export class JDoodleService implements CodeExecutionService {
  name = 'JDoodle';
  priority = 1; // Високий пріоритет
  is_available = true;
  
  private axiosInstance: AxiosInstance;
  private config: JDoodleConfig;
  private readonly rate_limit_delay = 1000; // 1 секунда між запитами
  private last_request_time = 0;

  // Мапінг мов для JDoodle
  private readonly language_map: Record<string, string> = {
    'python': 'python3',
    'javascript': 'nodejs',
    'typescript': 'typescript',
    'go': 'go',
    'java': 'java',
    'cpp': 'cpp17-gcc',
    'c': 'c17-gcc',
    'c++': 'cpp17-gcc',
    'ruby': 'ruby3',
    'php': 'php',
    'rust': 'rust',
    'csharp': 'csharp'
  };

  constructor(config?: Partial<JDoodleConfig>) {
    this.config = {
      client_id: config?.client_id || process.env.JDOODLE_CLIENT_ID || '',
      client_secret: config?.client_secret || process.env.JDOODLE_CLIENT_SECRET || '',
      base_url: config?.base_url || 'https://api.jdoodle.com/v1'
    };

    if (!this.config.client_id || !this.config.client_secret) {
      console.warn('⚠️ JDoodle credentials not provided. Service will be disabled.');
      this.is_available = false;
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.base_url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`🔧 JDoodle Service initialized (available: ${this.is_available})`);
  }

  /**
   * Отримати список підтримуваних мов
   */
  async getSupportedLanguages(): Promise<LanguageInfo[]> {
    const supportedLanguages = Object.keys(this.language_map);
    
    return supportedLanguages.map(lang => ({
      name: lang,
      versions: ['latest'], // JDoodle не надає версії
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

    const jdoodleLanguage = this.language_map[request.language.toLowerCase()];
    if (!jdoodleLanguage) {
      throw new Error(`Language ${request.language} is not supported by JDoodle`);
    }

    const payload = {
      clientId: this.config.client_id,
      clientSecret: this.config.client_secret,
      script: request.code,
      language: jdoodleLanguage,
      versionIndex: '0', // Використовувати останню версію
      stdin: request.stdin || '',
      compileOnly: false
    };

    try {
      console.log(`🔧 Executing ${request.language} code with JDoodle`);
      
      const response = await this.axiosInstance.post<JDoodleResponse>('/execute', payload);
      
      const result = response.data;
      
      // Визначаємо статус виконання
      let status: CodeExecutionResult['status'] = 'success';
      let exit_code = 0;
      
      if (result.error) {
        status = 'error';
        exit_code = 1;
      } else if (result.statusCode !== 200) {
        status = 'error';
        exit_code = result.statusCode;
      }

      return {
        language: request.language,
        version: 'latest',
        output: {
          exit_code,
          stdout: result.output || '',
          stderr: result.error || '',
          time: result.cpuTime || 0,
          memory: result.memory || 0,
          signal: undefined,
          compile_output: undefined
        },
        execution_time_ms: Math.round((result.cpuTime || 0) * 1000),
        memory_used_mb: Math.round((result.memory || 0) / 1024),
        status,
        service: this.name,
        request_time_ms: 0 // Буде встановлено в менеджері
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`JDoodle API error: ${message}`);
      }
      throw new Error(`JDoodle execution failed: ${error}`);
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
      console.error('JDoodle health check failed:', error);
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
