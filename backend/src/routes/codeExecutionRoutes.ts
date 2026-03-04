import { Router } from 'express';
import { codeExecutionController } from '../controllers/codeExecutionController';
import { executeCodeValidation } from '../middleware/codeExecutionValidation';

/**
 * Маршрути для виконання коду через Piston API
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
 * POST /api/code-execution/execute
 * Виконати код користувача
 * Body: {
 *   language: string,
 *   version?: string,
 *   code: string,
 *   stdin?: string,
 *   time_limit?: number,
 *   memory_limit?: number
 * }
 */
router.post('/execute', executeCodeValidation, codeExecutionController.executeCode);

export default router;
