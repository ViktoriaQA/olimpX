import { codeExecutionManager } from './codeExecutionService';
import { JDoodleService } from './jdoodleService';
import { OneCompilerService } from './oneCompilerService';
import { GlotService } from './glotService';
import { OnlineCompilerService } from './onlineCompilerService';

/**
 * Фабрика для ініціалізації сервісів виконання коду
 */
export class CodeExecutionFactory {
  private static initialized = false;

  /**
   * Ініціалізувати всі сервіси виконання коду
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔄 CodeExecution services already initialized');
      return;
    }

    console.log('🚀 Initializing CodeExecution services...');

    // Ініціалізуємо JDoodle
    const jdoodleService = new JDoodleService();
    if (jdoodleService.is_available) {
      codeExecutionManager.addService(jdoodleService);
      console.log('✅ JDoodle service added');
    } else {
      console.log('⚠️ JDoodle service disabled (missing credentials)');
    }

    // Ініціалізуємо OneCompiler
    const oneCompilerService = new OneCompilerService();
    if (oneCompilerService.is_available) {
      codeExecutionManager.addService(oneCompilerService);
      console.log('✅ OneCompiler service added');
    } else {
      console.log('⚠️ OneCompiler service disabled (missing API key)');
    }

    // Ініціалізуємо Glot
    const glotService = new GlotService();
    if (glotService.is_available) {
      codeExecutionManager.addService(glotService);
      console.log('✅ Glot service added');
    } else {
      console.log('⚠️ Glot service disabled (missing API token)');
    }

    // Ініціалізуємо MyCompiler
    const myCompilerService = new OnlineCompilerService();
    if (myCompilerService.is_available) {
      codeExecutionManager.addService(myCompilerService);
      console.log('✅ MyCompiler service added');
    } else {
      console.log('⚠️ MyCompiler service disabled (missing API key)');
    }

    // Перевіряємо здоров'я сервісів
    console.log('🏥 Performing health checks...');
    await this.performHealthChecks();

    // Встановлюємо слухачів подій
    this.setupEventListeners();

    this.initialized = true;
    console.log('✅ CodeExecution services initialization completed');
  }

  /**
   * Виконати перевірку здоров'я всіх сервісів
   */
  private static async performHealthChecks(): Promise<void> {
    const stats = codeExecutionManager.getStats();
    
    for (const service of stats.services) {
      console.log(`🔍 Checking ${service.name}...`);
      
      if (service.available) {
        console.log(`✅ ${service.name} is healthy`);
      } else {
        console.log(`❌ ${service.name} is unavailable`);
      }
    }
  }

  /**
   * Налаштувати слухачів подій
   */
  private static setupEventListeners(): void {
    // Слухач для успішного виконання
    codeExecutionManager.on('execution_completed', ({ item, result }) => {
      console.log(`✅ Execution completed: ${item.request.language} via ${result.service} (${result.execution_time_ms}ms)`);
    });

    // Слухач для невдалого виконання
    codeExecutionManager.on('execution_failed', ({ item, error }) => {
      console.error(`❌ Execution failed: ${item.request.language} - ${error.message}`);
    });
  }

  /**
   * Отримати статистику сервісів
   */
  static getStats() {
    return codeExecutionManager.getStats();
  }

  /**
   * Очистити кеш
   */
  static clearCache(): void {
    codeExecutionManager.clearCache();
  }

  /**
   * Перевірити ініціалізацію
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
}

// Експорт для зручності
export { codeExecutionManager };
