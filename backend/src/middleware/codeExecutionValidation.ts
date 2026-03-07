import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Правила валідації для запиту на виконання коду
 */
export const executeCodeValidation = [
  // Валідація мови програмування
  body('language')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Мова програмування є обов\'язковою')
    .isIn(['javascript', 'typescript', 'python', 'go'])
    .withMessage('Підтримуються тільки мови: javascript, typescript, python, go'),

  // Валідація коду
  body('code')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Код для виконання є обов\'язковим')
    .isLength({ min: 1, max: 50000 })
    .withMessage('Розмір коду повинен бути від 1 до 50000 символів'),

  // Валідація вхідних даних (необов'язкові)
  body('stdin')
    .optional()
    .isString()
    .withMessage('Вхідні дані повинні бути рядком')
    .isLength({ max: 10000 })
    .withMessage('Розмір вхідних даних не повинен перевищувати 10000 символів'),

  // Валідація обмеження часу (необов'язкове)
  body('time_limit')
    .optional()
    .isInt({ min: 100, max: 60000 })
    .withMessage('Обмеження часу повинно бути числом від 100мс до 60с'),

  // Валідація обмеження пам'яті (необов'язкове)
  body('memory_limit')
    .optional()
    .isInt({ min: 1048576, max: 1073741824 }) // 1MB - 1GB
    .withMessage('Обмеження пам\'яті повинно бути числом від 1MB до 1GB'),
];

/**
 * Middleware для перевірки результатів валідації
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Помилка валідації вхідних даних',
      errors: errors.array().map(error => ({
        field: 'param' in error ? error.param : 'unknown',
        message: error.msg,
        value: 'value' in error ? error.value : undefined
      }))
    });
    return;
  }
  next();
};

/**
 * Rate limiting middleware для виконання коду
 */
export const codeExecutionRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // Простий rate limiting по IP (можна замінити на Redis)
  const clientIp = req.ip || 'unknown';
  const now = Date.now();
  
  // В реальному додатку тут була б перевірка в Redis/базі даних
  // Поки що просто логуємо запит
  console.log(`🔍 Code execution request from ${clientIp} at ${new Date(now).toISOString()}`);
  
  next();
};
