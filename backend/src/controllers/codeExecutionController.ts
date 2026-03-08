import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { codeExecutionManager, CodeExecutionRequest } from '../services/codeExecutionService';
import { CodeExecutionFactory } from '../services/codeExecutionFactory';

console.log('📝 CodeExecutionController loaded');

/**
 * Контролер для обробки запитів на виконання коду
 */
export class CodeExecutionController {
  /**
   * Отримати список доступних мов програмування
   * @param req Express Request
   * @param res Express Response
   */
  async getLanguages(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Getting languages...');
      
      // Переконуємось, що сервіси ініціалізовані
      if (!CodeExecutionFactory.isInitialized()) {
        await CodeExecutionFactory.initialize();
      }

      const languages = await codeExecutionManager.getSupportedLanguages();
      console.log(`✅ Got ${languages.length} languages`);
      
      // Фільтруємо тільки потрібні мови (JS, TS, Python, Go)
      const supportedLanguages = languages.filter(lang => 
        ['javascript', 'typescript', 'python', 'go'].includes(lang.name.toLowerCase())
      );

      // Сортуємо мови для кращого UX
      supportedLanguages.sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        success: true,
        data: supportedLanguages,
        message: 'Список доступних мов отримано успішно'
      });
    } catch (error) {
      console.error('Помилка отримання мов:', error);
      res.status(500).json({
        success: false,
        message: 'Не вдалося отримати список мов',
        error: error instanceof Error ? error.message : 'Невідома помилка'
      });
    }
  }

  /**
   * Виконати код користувача
   * @param req Express Request
   * @param res Express Response
   */
  async executeCode(req: Request, res: Response): Promise<void> {
    try {
      // Перевірка валідації
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Помилка валідації вхідних даних',
          errors: errors.array()
        });
        return;
      }

      // Переконуємось, що сервіси ініціалізовані
      if (!CodeExecutionFactory.isInitialized()) {
        await CodeExecutionFactory.initialize();
      }

      const { language, code, stdin, time_limit, memory_limit } = req.body;

      // Формуємо запит на виконання
      const executionRequest: CodeExecutionRequest = {
        language,
        code,
        stdin: stdin || '',
        time_limit: time_limit || 10000, // 10 секунд за замовчуванням
        memory_limit: memory_limit || 128 * 1024 * 1024, // 128MB за замовчуванням
        client_id: req.ip || 'anonymous'
      };

      console.log(`🔧 Executing ${language} code...`);

      // Виконуємо код через менеджер
      const result = await codeExecutionManager.executeCode(executionRequest);

      // Формуємо відповідь
      const response = {
        success: true,
        data: {
          language: result.language,
          version: result.version,
          output: {
            stdout: result.output.stdout,
            stderr: result.output.stderr,
            exit_code: result.output.exit_code,
            time: result.output.time,
            memory: result.output.memory,
            signal: result.output.signal,
            compile_output: result.output.compile_output,
          },
          execution_time_ms: result.execution_time_ms,
          memory_used_mb: result.memory_used_mb,
          status: result.status,
          service: result.service,
          request_time_ms: result.request_time_ms,
        },
        message: 'Код виконано успішно'
      };

      console.log(`✅ Code executed via ${result.service} (${result.execution_time_ms}ms)`);
      res.json(response);
    } catch (error) {
      console.error('Помилка виконання коду:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка виконання коду',
        error: error instanceof Error ? error.message : 'Невідома помилка'
      });
    }
  }

  /**
   * Виконати код проти набору тестів
   * @param req Express Request
   * @param res Express Response
   */
  async runTests(req: Request, res: Response): Promise<void> {
    try {
      const { language, code, test_cases, time_limit, memory_limit, run_only_visible } = req.body;

      // Валідація вхідних даних
      if (!language || !code || !test_cases || !Array.isArray(test_cases)) {
        res.status(400).json({
          success: false,
          message: 'Обов\'язкові поля: language, code, test_cases'
        });
        return;
      }

      // Переконуємось, що сервіси ініціалізовані
      if (!CodeExecutionFactory.isInitialized()) {
        await CodeExecutionFactory.initialize();
      }

      // Фільтруємо тест кейси залежно від флага run_only_visible
      let filteredTestCases = test_cases;
      if (run_only_visible === true) {
        // Для RUN: виконуємо тільки видимі тест кейси
        filteredTestCases = test_cases.filter(tc => tc.visible !== false);
        console.log(`👁️ Running only visible tests: ${filteredTestCases.length}/${test_cases.length}`);
      } else {
        // Для SEND: виконуємо всі тест кейси
        console.log(`🚀 Running all tests: ${test_cases.length}`);
      }

      console.log(`🧪 Running ${filteredTestCases.length} tests for ${language} code...`);

      const results = [];
      let totalTests = filteredTestCases.length;
      let passedTests = 0;
      let totalTime = 0;

      // Виконуємо кожен тест
      for (let i = 0; i < filteredTestCases.length; i++) {
        const testCase = filteredTestCases[i];
        
        try {
          const executionRequest: CodeExecutionRequest = {
            language,
            code,
            stdin: testCase.input || '',
            time_limit: time_limit || 10000,
            memory_limit: memory_limit || 128 * 1024 * 1024,
            client_id: req.ip || 'anonymous'
          };

          const result = await codeExecutionManager.executeCode(executionRequest);
          
          const passed = result.output.stdout.trim() === testCase.expected_output.trim();
          if (passed) passedTests++;
          
          totalTime += result.execution_time_ms;

          results.push({
            id: `test-${i + 1}`,
            name: `Тест ${i + 1}`,
            input: testCase.input,
            expected_output: testCase.expected_output,
            actual_output: result.output.stdout,
            passed,
            execution_time: result.execution_time_ms,
            memory_usage: result.memory_used_mb * 1024 * 1024, // Конвертуємо в байти
            error: result.output.stderr || null,
            visible: testCase.visible !== false // За замовчуванням видимий
          });

        } catch (error) {
          results.push({
            id: `test-${i + 1}`,
            name: `Тест ${i + 1}`,
            input: testCase.input,
            expected_output: testCase.expected_output,
            actual_output: '',
            passed: false,
            execution_time: 0,
            memory_usage: 0,
            error: error instanceof Error ? error.message : 'Невідома помилка',
            visible: testCase.visible !== false
          });
        }
      }

      // Розрахунок балів (максимум 100, округлено до цілого)
      const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

      const testResults = {
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: totalTests - passedTests,
        total_time: totalTime,
        test_cases: results,
        score
      };

      console.log(`✅ Tests completed: ${passedTests}/${totalTests} passed, Score: ${score}`);

      res.json({
        success: true,
        data: testResults,
        message: 'Тести виконано успішно'
      });

    } catch (error) {
      console.error('Помилка виконання тестів:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка виконання тестів',
        error: error instanceof Error ? error.message : 'Невідома помилка'
      });
    }
  }

  /**
   * Отримати інформацію про конкретну мову
   * @param req Express Request
   * @param res Express Response
   */
  async getLanguageInfo(req: Request, res: Response): Promise<void> {
    try {
      const { language } = req.params;
      
      if (!language) {
        res.status(400).json({
          success: false,
          message: 'Назва мови є обов\'язковою'
        });
        return;
      }

      // Переконуємось, що сервіси ініціалізовані
      if (!CodeExecutionFactory.isInitialized()) {
        await CodeExecutionFactory.initialize();
      }

      const isSupported = await codeExecutionManager.isLanguageSupported(language);

      if (!isSupported) {
        res.status(404).json({
          success: false,
          message: `Мова ${language} не підтримується`
        });
        return;
      }

      // Отримуємо детальну інформацію про мову
      const languages = await codeExecutionManager.getSupportedLanguages();
      const langInfo = languages.find(lang => lang.name.toLowerCase() === language.toLowerCase());

      res.json({
        success: true,
        data: {
          language,
          supported: true,
          versions: langInfo?.versions || ['latest'],
          supported_services: langInfo?.supported_services || [],
        },
        message: 'Інформацію про мову отримано успішно'
      });
    } catch (error) {
      console.error('Помилка отримання інформації про мову:', error);
      res.status(500).json({
        success: false,
        message: 'Не вдалося отримати інформацію про мову',
        error: error instanceof Error ? error.message : 'Невідома помилка'
      });
    }
  }

  /**
   * Отримати статистику системи виконання коду
   * @param req Express Request
   * @param res Express Response
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      // Переконуємось, що сервіси ініціалізовані
      if (!CodeExecutionFactory.isInitialized()) {
        await CodeExecutionFactory.initialize();
      }

      const stats = codeExecutionManager.getStats();

      res.json({
        success: true,
        data: stats,
        message: 'Статистику системи отримано успішно'
      });
    } catch (error) {
      console.error('Помилка отримання статистики:', error);
      res.status(500).json({
        success: false,
        message: 'Не вдалося отримати статистику',
        error: error instanceof Error ? error.message : 'Невідома помилка'
      });
    }
  }

  /**
   * Очистити кеш системи виконання коду
   * @param req Express Request
   * @param res Express Response
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      CodeExecutionFactory.clearCache();

      res.json({
        success: true,
        message: 'Кеш успішно очищено'
      });
    } catch (error) {
      console.error('Помилка очищення кешу:', error);
      res.status(500).json({
        success: false,
        message: 'Не вдалося очистити кеш',
        error: error instanceof Error ? error.message : 'Невідома помилка'
      });
    }
  }
}

// Експорт екземпляру контролера
export const codeExecutionController = new CodeExecutionController();
