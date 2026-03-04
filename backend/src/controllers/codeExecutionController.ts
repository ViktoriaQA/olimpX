import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pistonService, ExecutionRequest } from '../services/pistonService';

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
      const languages = await pistonService.getAvailableLanguages();
      
      // Фільтруємо тільки потрібні мови (JS, TS, Python, C++)
      const supportedLanguages = languages.filter(lang => 
        ['javascript', 'typescript', 'python', 'cpp', 'c++'].includes(lang.name.toLowerCase())
      );

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

      const { language, version, code, stdin, time_limit, memory_limit } = req.body;

      // Перевіряємо, чи підтримується мова
      const isSupported = await pistonService.isLanguageSupported(language, version);
      if (!isSupported) {
        res.status(400).json({
          success: false,
          message: `Мова ${language} (${version}) не підтримується`
        });
        return;
      }

      // Якщо версія не вказана, отримуємо рекомендовану
      let finalVersion = version;
      if (!finalVersion) {
        finalVersion = await pistonService.getRecommendedVersion(language);
        if (!finalVersion) {
          res.status(400).json({
            success: false,
            message: `Не вдалося знайти версію для мови ${language}`
          });
          return;
        }
      }

      // Формуємо запит на виконання
      const executionRequest: ExecutionRequest = {
        language,
        version: finalVersion,
        code,
        stdin: stdin || '',
        time_limit: time_limit || 10000, // 10 секунд за замовчуванням
        memory_limit: memory_limit || 128 * 1024 * 1024, // 128MB за замовчуванням
      };

      // Виконуємо код
      const result = await pistonService.executeCode(executionRequest);

      // Формуємо відповідь
      const response = {
        success: true,
        data: {
          language: result.language,
          version: result.version,
          output: {
            stdout: result.run.stdout,
            stderr: result.run.stderr,
            exit_code: result.run.exit_code,
            time: result.run.time,
            memory: result.run.memory,
            signal: result.run.signal,
            compile_output: result.run.compile_output,
          },
          execution_time_ms: Math.round(result.run.time * 1000),
          memory_used_mb: Math.round(result.run.memory / 1024 / 1024),
          status: this.getExecutionStatus(result.run.exit_code, result.run.signal),
        },
        message: 'Код виконано успішно'
      };

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
   * Перевірити статус виконання коду
   * @param exitCode Код виходу
   * @param signal Сигнал завершення
   * @returns Статус виконання
   * @private
   */
  private getExecutionStatus(exitCode: number, signal: string | null): string {
    if (signal) {
      return 'terminated';
    }
    
    if (exitCode === 0) {
      return 'success';
    }
    
    return 'error';
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

      const isSupported = await pistonService.isLanguageSupported(language);
      const recommendedVersion = await pistonService.getRecommendedVersion(language);

      if (!isSupported) {
        res.status(404).json({
          success: false,
          message: `Мова ${language} не підтримується`
        });
        return;
      }

      res.json({
        success: true,
        data: {
          language,
          supported: true,
          recommended_version: recommendedVersion,
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
}

// Експорт екземпляру контролера
export const codeExecutionController = new CodeExecutionController();
