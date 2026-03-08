import { Router } from 'express';
import { codeExecutionController } from '../controllers/codeExecutionController';
import { executeCodeValidation, validateRequest, codeExecutionRateLimit } from '../middleware/codeExecutionValidation';

/**
 * Маршрути для виконання коду через JDoodle та OneCompiler API
 */
const router = Router();

/**
 * GET /api/code-execution/languages
 * Отримати список доступних мов програмування
 */
router.get('/languages', codeExecutionController.getLanguages);

/**
 * GET /api/code-execution/languages/:language
 * Отримати інформацію про конкретну мову
 */
router.get('/languages/:language', codeExecutionController.getLanguageInfo);

/**
 * GET /api/code-execution/stats
 * Отримати статистику системи виконання коду
 */
router.get('/stats', codeExecutionController.getStats);

/**
 * DELETE /api/code-execution/cache
 * Очистити кеш системи виконання коду
 */
router.delete('/cache', codeExecutionController.clearCache);

/**
 * POST /api/code-execution/execute
 * Виконати код користувача
 * Body: {
 *   language: string,
 *   code: string,
 *   stdin?: string,
 *   time_limit?: number,
 *   memory_limit?: number
 * }
 */
router.post('/execute', 
  codeExecutionRateLimit,
  executeCodeValidation,
  validateRequest,
  codeExecutionController.executeCode
);

/**
 * POST /api/code-execution/run-tests
 * Виконати код проти набору тестів
 * Body: {
 *   language: string,
 *   code: string,
 *   test_cases: Array<{
 *     input: string,
 *     expected_output: string,
 *     visible?: boolean
 *   }>,
 *   time_limit?: number,
 *   memory_limit?: number
 * }
 */
router.post('/run-tests', 
  codeExecutionRateLimit,
  codeExecutionController.runTests
);

export default router;
