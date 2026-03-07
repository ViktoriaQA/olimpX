import axios, { AxiosInstance } from 'axios';
import { CodeExecutionService, CodeExecutionRequest, CodeExecutionResult, LanguageInfo } from './codeExecutionService';

/**
 * Glot API відповідь
 */
interface GlotResponse {
  stdout: string;
  stderr: string;
  error?: string;
  exit_code: number;
  signal?: string;
  time?: number;
  memory?: number;
}

/**
 * Glot конфігурація
 */
interface GlotConfig {
  api_token: string;
  base_url: string;
}

/**
 * Сервіс для виконання коду через Glot API
 */
export class GlotService implements CodeExecutionService {
  name = 'Glot';
  priority = 3; // Середній пріоритет
  is_available = true;
  
  private axiosInstance: AxiosInstance;
  private config: GlotConfig;
  private readonly rate_limit_delay = 1500; // 1.5 секунди між запитами
  private last_request_time = 0;

  // Мапінг мов для Glot
  private readonly language_map: Record<string, { language: string; version: string }> = {
    'python': { language: 'python', version: '3.10' },
    'javascript': { language: 'javascript', version: 'node' },
    'typescript': { language: 'typescript', version: '5.0' },
    'go': { language: 'go', version: '1.19' },
    'java': { language: 'java', version: '17' },
    'cpp': { language: 'c++', version: 'gcc-9.3.0' },
    'c': { language: 'c', version: 'gcc-9.3.0' },
    'c++': { language: 'c++', version: 'gcc-9.3.0' },
    'ruby': { language: 'ruby', version: '3.2' },
    'php': { language: 'php', version: '8.2' },
    'rust': { language: 'rust', version: '1.70' },
    'csharp': { language: 'csharp', version: '6.0' },
    'haskell': { language: 'haskell', version: '9.4' },
    'elixir': { language: 'elixir', version: '1.15' },
    'kotlin': { language: 'kotlin', version: '1.9' },
    'scala': { language: 'scala', version: '3.3' },
    'raku': { language: 'raku', version: 'rakudo' },
    'perl': { language: 'perl', version: '5.38' },
    'bash': { language: 'bash', version: '5.2' }
  };

  constructor(config?: Partial<GlotConfig>) {
    this.config = {
      api_token: config?.api_token || process.env.GLOT_API_TOKEN || '',
      base_url: config?.base_url || 'https://glot.io'
    };

    if (!this.config.api_token) {
      console.warn('⚠️ Glot API token not provided. Service will be disabled.');
      this.is_available = false;
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.base_url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.config.api_token}`
      },
    });

    console.log(`🔧 Glot Service initialized (available: ${this.is_available})`);
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
        versions: [config.version],
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
      throw new Error(`Language ${request.language} is not supported by Glot`);
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
      command: this.getCommand(request.language),
      compiler_flags: this.getCompilerFlags(request.language)
    };

    try {
      console.log(`🔧 Executing ${request.language} code with Glot`);
      
      const response = await this.axiosInstance.post<GlotResponse>('/run', payload);
      
      const result = response.data;
      
      // Визначаємо статус виконання
      let status: CodeExecutionResult['status'] = 'success';
      
      if (result.error) {
        status = 'error';
      } else if (result.exit_code !== 0) {
        status = 'error';
      }

      return {
        language: request.language,
        version: languageConfig.version,
        output: {
          exit_code: result.exit_code,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          time: result.time || 0,
          memory: result.memory || 0,
          signal: result.signal,
          compile_output: undefined
        },
        execution_time_ms: Math.round((result.time || 0) * 1000),
        memory_used_mb: Math.round((result.memory || 0) / 1024 / 1024),
        status,
        service: this.name,
        request_time_ms: 0 // Буде встановлено в менеджері
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        
        // Перевіряємо, чи це помилка ліміту
        if (error.response?.status === 429) {
          throw new Error(`Glot API rate limit exceeded: ${message}`);
        }
        
        throw new Error(`Glot API error: ${message}`);
      }
      throw new Error(`Glot execution failed: ${error}`);
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
      console.error('Glot health check failed:', error);
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
      'csharp': 'Main.cs',
      'haskell': 'Main.hs',
      'elixir': 'main.ex',
      'kotlin': 'Main.kt',
      'scala': 'Main.scala',
      'raku': 'main.raku',
      'perl': 'main.pl',
      'bash': 'main.sh'
    };

    return extensions[language.toLowerCase()] || 'main.txt';
  }

  /**
   * Отримати команду для виконання
   */
  private getCommand(language: string): string[] | undefined {
    const commands: Record<string, string[]> = {
      'python': ['python', 'main.py'],
      'javascript': ['node', 'main.js'],
      'typescript': ['npx', 'ts-node', 'main.ts'],
      'go': ['go', 'run', 'main.go'],
      'java': ['java', 'Main.java'],
      'cpp': ['g++', '-o', 'main', 'main.cpp', '&&', './main'],
      'c': ['gcc', '-o', 'main', 'main.c', '&&', './main'],
      'c++': ['g++', '-o', 'main', 'main.cpp', '&&', './main'],
      'ruby': ['ruby', 'main.rb'],
      'php': ['php', 'main.php'],
      'rust': ['rustc', 'main.rs', '&&', './main'],
      'csharp': ['dotnet', 'run'],
      'haskell': ['runhaskell', 'Main.hs'],
      'elixir': ['elixir', 'main.ex'],
      'kotlin': ['kotlinc', 'Main.kt', '-include-runtime', '-d', 'Main.jar', '&&', 'java', '-jar', 'Main.jar'],
      'scala': ['scala', 'Main.scala'],
      'raku': ['raku', 'main.raku'],
      'perl': ['perl', 'main.pl'],
      'bash': ['bash', 'main.sh']
    };

    return commands[language.toLowerCase()];
  }

  /**
   * Отримати прапорці компілятора
   */
  private getCompilerFlags(language: string): string[] | undefined {
    const flags: Record<string, string[]> = {
      'cpp': ['-Wall', '-Wextra', '-O2'],
      'c': ['-Wall', '-Wextra', '-O2'],
      'c++': ['-Wall', '-Wextra', '-O2'],
      'rust': ['-O'],
      'java': ['-Xlint:all']
    };

    return flags[language.toLowerCase()];
  }
}
