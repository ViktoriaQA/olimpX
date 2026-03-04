import { body } from 'express-validator';

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
    .isIn(['javascript', 'typescript', 'python', 'cpp', 'c++'])
    .withMessage('Підтримуються тільки мови: javascript, typescript, python, cpp'),

  // Валідація версії (необов'язкова, якщо не вказано - буде використано рекомендовану)
  body('version')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Версія повинна бути рядком'),

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
