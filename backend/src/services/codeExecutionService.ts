import { EventEmitter } from 'events';

/**
 * Інтерфейс для запиту на виконання коду
 */
export interface CodeExecutionRequest {
  /** Мова програмування */
  language: string;
  /** Код для виконання */
  code: string;
  /** Вхідні дані для stdin */
  stdin?: string;
  /** Обмеження за часом у мс */
  time_limit?: number;
  /** Обмеження по пам'яті у байтах */
  memory_limit?: number;
  /** Клієнт ID для ідентифікації */
  client_id?: string;
}

/**
 * Інтерфейс для результату виконання коду
 */
export interface CodeExecutionResult {
  /** Мова виконання */
  language: string;
  /** Версія мови */
  version?: string;
  /** Результат виконання */
  output: {
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
    signal?: string;
    /** Статус компіляції */
    compile_output?: string;
  };
  /** Час виконання в мс */
  execution_time_ms: number;
  /** Використана пам'ять в MB */
  memory_used_mb: number;
  /** Статус виконання */
  status: 'success' | 'error' | 'timeout' | 'memory_limit' | 'terminated';
  /** Сервіс, який виконав код */
  service: string;
  /** Час виконання запиту */
  request_time_ms: number;
}

/**
 * Інтерфейс для інформації про доступну мову
 */
export interface LanguageInfo {
  /** Назва мови */
  name: string;
  /** Доступні версії */
  versions: string[];
  /** Підтримувані сервіси */
  supported_services: string[];
}

/**
 * Інтерфейс для сервісу виконання коду
 */
export interface CodeExecutionService {
  /** Назва сервісу */
  name: string;
  /** Пріоритет сервісу (нижче = вищий пріоритет) */
  priority: number;
  /** Чи доступний сервіс */
  is_available: boolean;
  /** Отримати список підтримуваних мов */
  getSupportedLanguages(): Promise<LanguageInfo[]>;
  /** Перевірити, чи підтримується мова */
  isLanguageSupported(language: string): Promise<boolean>;
  /** Виконати код */
  executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
  /** Перевірити здоров'я сервісу */
  healthCheck(): Promise<boolean>;
}

/**
 * Статус елемента черги
 */
export interface QueueItem {
  id: string;
  request: CodeExecutionRequest;
  resolve: (result: CodeExecutionResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retries: number;
  max_retries: number;
}

/**
 * Основний сервіс для виконання коду з автоматичним перемиканням
 */
export class CodeExecutionManager extends EventEmitter {
  private services: CodeExecutionService[] = [];
  private queue: QueueItem[] = [];
  private processing = false;
  private cache = new Map<string, { result: CodeExecutionResult; timestamp: number }>();
  private readonly cache_ttl = 5 * 60 * 1000; // 5 хвилин
  private readonly max_queue_size = 100;
  private readonly max_concurrent = 5;
  private current_requests = 0;

  constructor() {
    super();
    console.log('🚀 CodeExecutionManager initialized');
  }

  /**
   * Додати сервіс виконання коду
   */
  addService(service: CodeExecutionService): void {
    this.services.push(service);
    this.services.sort((a, b) => a.priority - b.priority);
    console.log(`➕ Added service: ${service.name} (priority: ${service.priority})`);
  }

  /**
   * Отримати список доступних мов
   */
  async getSupportedLanguages(): Promise<LanguageInfo[]> {
    const languages = new Map<string, LanguageInfo>();

    for (const service of this.services) {
      try {
        if (!service.is_available) continue;
        
        const serviceLanguages = await service.getSupportedLanguages();
        for (const lang of serviceLanguages) {
          const existing = languages.get(lang.name);
          if (existing) {
            // Об'єднуємо версії та сервіси
            existing.versions = [...new Set([...existing.versions, ...lang.versions])];
            existing.supported_services = [...new Set([...existing.supported_services, ...lang.supported_services])];
          } else {
            languages.set(lang.name, lang);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to get languages from ${service.name}:`, error);
        service.is_available = false;
      }
    }

    return Array.from(languages.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Перевірити, чи підтримується мова
   */
  async isLanguageSupported(language: string): Promise<boolean> {
    for (const service of this.services) {
      if (!service.is_available) continue;
      
      try {
        if (await service.isLanguageSupported(language)) {
          return true;
        }
      } catch (error) {
        console.error(`❌ Failed to check language support for ${service.name}:`, error);
        service.is_available = false;
      }
    }
    return false;
  }

  /**
   * Виконати код з автоматичним перемиканням між сервісами
   */
  async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // Генеруємо ключ для кешування
    const cacheKey = this.generateCacheKey(request);
    
    // Перевіряємо кеш
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cache_ttl) {
      console.log(`📋 Cache hit for ${request.language} execution`);
      return cached.result;
    }

    return new Promise((resolve, reject) => {
      const queueItem: QueueItem = {
        id: this.generateId(),
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
        max_retries: 3
      };

      // Перевіряємо розмір черги
      if (this.queue.length >= this.max_queue_size) {
        reject(new Error('Queue is full. Please try again later.'));
        return;
      }

      this.queue.push(queueItem);
      this.processQueue();
    });
  }

  /**
   * Обробити чергу запитів
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.current_requests >= this.max_concurrent || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.current_requests < this.max_concurrent) {
      const item = this.queue.shift();
      if (!item) break;

      this.current_requests++;
      this.processItem(item);
    }

    this.processing = false;
  }

  /**
   * Обробити один елемент черги
   */
  private async processItem(item: QueueItem): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await this.executeWithFallback(item.request);
      result.request_time_ms = Date.now() - startTime;

      // Кешуємо результат
      const cacheKey = this.generateCacheKey(item.request);
      this.cache.set(cacheKey, { result, timestamp: Date.now() });

      item.resolve(result);
      this.emit('execution_completed', { item, result });
    } catch (error) {
      item.retries++;
      
      if (item.retries < item.max_retries) {
        console.log(`🔄 Retrying execution for ${item.request.language} (attempt ${item.retries + 1})`);
        this.queue.unshift(item);
      } else {
        item.reject(error as Error);
        this.emit('execution_failed', { item, error });
      }
    } finally {
      this.current_requests--;
      this.processQueue();
    }
  }

  /**
   * Виконати код з перемиканням між сервісами
   */
  private async executeWithFallback(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    let lastError: Error | null = null;

    for (const service of this.services) {
      if (!service.is_available) continue;

      try {
        // Перевіряємо підтримку мови
        const isSupported = await service.isLanguageSupported(request.language);
        if (!isSupported) {
          console.log(`⚠️ ${service.name} doesn't support ${request.language}`);
          continue;
        }

        console.log(`🔧 Executing ${request.language} code with ${service.name}`);
        const result = await service.executeCode(request);
        
        // Позначаємо сервіс як доступний
        service.is_available = true;
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${service.name} failed:`, error);
        
        // Позначаємо сервіс як недоступний
        service.is_available = false;
        
        // Запускаємо перевірку здоров'я у фоновому режимі
        this.scheduleHealthCheck(service);
      }
    }

    throw lastError || new Error('No available execution services');
  }

  /**
   * Запланувати перевірку здоров'я сервісу
   */
  private scheduleHealthCheck(service: CodeExecutionService): void {
    setTimeout(async () => {
      try {
        const isHealthy = await service.healthCheck();
        service.is_available = isHealthy;
        console.log(`🏥 Health check for ${service.name}: ${isHealthy ? 'OK' : 'FAILED'}`);
      } catch (error) {
        service.is_available = false;
        console.error(`🏥 Health check failed for ${service.name}:`, error);
      }
    }, 30000); // 30 секунд
  }

  /**
   * Генерувати ключ для кешування
   */
  private generateCacheKey(request: CodeExecutionRequest): string {
    const hash = Buffer.from(JSON.stringify({
      language: request.language,
      code: request.code,
      stdin: request.stdin || '',
      time_limit: request.time_limit,
      memory_limit: request.memory_limit
    })).toString('base64');
    return hash.substring(0, 32);
  }

  /**
   * Генерувати унікальний ID
   */
  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Отримати статистику системи
   */
  getStats() {
    return {
      queue_size: this.queue.length,
      current_requests: this.current_requests,
      cache_size: this.cache.size,
      services: this.services.map(service => ({
        name: service.name,
        priority: service.priority,
        available: service.is_available
      }))
    };
  }

  /**
   * Очистити кеш
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
}

// Експорт екземпляру менеджера
export const codeExecutionManager = new CodeExecutionManager();
