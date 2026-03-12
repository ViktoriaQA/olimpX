import { Router } from 'express';
import { codeExecutionController } from '../controllers/codeExecutionController';
import { executeCodeValidation, validateRequest, codeExecutionRateLimit } from '../middleware/codeExecutionValidation';

/**
 * Маршрути для виконання коду через JDoodle та OneCompiler API
 */
const router = Router();

/**
 * @swagger
 * /api/code-execution/languages:
 *   get:
 *     tags: [Code Execution]
 *     summary: Get supported programming languages
 *     description: Get a list of all supported programming languages and their versions
 *     responses:
 *       200:
 *         description: Languages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Language name
 *                       versions:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Available versions
 *                       supported_services:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Services that support this language
 *                 message:
 *                   type: string
 *                   description: Response message
 *       500:
 *         description: Failed to fetch languages
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/languages', codeExecutionController.getLanguages);

/**
 * @swagger
 * /api/code-execution/languages/{language}:
 *   get:
 *     tags: [Code Execution]
 *     summary: Get language information
 *     description: Get detailed information about a specific programming language
 *     parameters:
 *       - in: path
 *         name: language
 *         required: true
 *         schema:
 *           type: string
 *           enum: [python, javascript, typescript, go]
 *         description: Programming language name
 *     responses:
 *       200:
 *         description: Language information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     language:
 *                       type: string
 *                       description: Language name
 *                     supported:
 *                       type: boolean
 *                       description: Whether the language is supported
 *                     recommended_version:
 *                       type: string
 *                       description: Recommended version
 *                 message:
 *                   type: string
 *                   description: Response message
 *       404:
 *         description: Language not supported
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch language info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/languages/:language', codeExecutionController.getLanguageInfo);

/**
 * @swagger
 * /api/code-execution/stats:
 *   get:
 *     tags: [Code Execution]
 *     summary: Get system statistics
 *     description: Get statistics about the code execution system
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     queue_size:
 *                       type: integer
 *                       description: Number of requests in queue
 *                     current_requests:
 *                       type: integer
 *                       description: Number of currently executing requests
 *                     cache_size:
 *                       type: integer
 *                       description: Number of cached results
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: Service name
 *                           priority:
 *                             type: integer
 *                             description: Service priority
 *                           available:
 *                             type: boolean
 *                             description: Whether the service is available
 *                 message:
 *                   type: string
 *                   description: Response message
 *       500:
 *         description: Failed to fetch statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', codeExecutionController.getStats);

/**
 * @swagger
 * /api/code-execution/cache:
 *   delete:
 *     tags: [Code Execution]
 *     summary: Clear execution cache
 *     description: Clear the code execution cache
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the cache was cleared
 *                 message:
 *                   type: string
 *                   description: Response message
 *       500:
 *         description: Failed to clear cache
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/cache', codeExecutionController.clearCache);

/**
 * @swagger
 * /api/code-execution/execute:
 *   post:
 *     tags: [Code Execution]
 *     summary: Execute code
 *     description: Execute code in the specified programming language
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CodeExecutionRequest'
 *     responses:
 *       200:
 *         description: Code executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CodeExecutionResponse'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Execution failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/execute', 
  codeExecutionRateLimit,
  executeCodeValidation,
  validateRequest,
  codeExecutionController.executeCode
);

/**
 * @swagger
 * /api/code-execution/run-tests:
 *   post:
 *     tags: [Code Execution]
 *     summary: Run code against test cases
 *     description: Execute code against a set of test cases
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *               - code
 *               - test_cases
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [python, javascript, typescript, go]
 *                 description: Programming language
 *               code:
 *                 type: string
 *                 maxLength: 50000
 *                 description: Code to execute
 *               test_cases:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - input
 *                     - expected_output
 *                   properties:
 *                     input:
 *                       type: string
 *                       description: Test input
 *                     expected_output:
 *                       type: string
 *                       description: Expected output
 *                     visible:
 *                       type: boolean
 *                       description: Whether this test case is visible to the user
 *                 description: Array of test cases
 *               time_limit:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 60000
 *                 description: Time limit in milliseconds
 *               memory_limit:
 *                 type: integer
 *                 minimum: 1048576
 *                 maximum: 1073741824
 *                 description: Memory limit in bytes
 *     responses:
 *       200:
 *         description: Tests executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the tests were executed
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           test_index:
 *                             type: integer
 *                             description: Test case index
 *                           passed:
 *                             type: boolean
 *                             description: Whether the test passed
 *                           actual_output:
 *                             type: string
 *                             description: Actual output
 *                           expected_output:
 *                             type: string
 *                             description: Expected output
 *                           execution_time:
 *                             type: number
 *                             description: Execution time in seconds
 *                           memory_used:
 *                             type: integer
 *                             description: Memory used in bytes
 *                           visible:
 *                             type: boolean
 *                             description: Whether this result is visible
 *                     total_tests:
 *                       type: integer
 *                       description: Total number of tests
 *                     passed_tests:
 *                       type: integer
 *                       description: Number of passed tests
 *                     total_execution_time:
 *                       type: number
 *                       description: Total execution time
 *                 message:
 *                   type: string
 *                   description: Response message
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Test execution failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/run-tests', 
  codeExecutionRateLimit,
  codeExecutionController.runTests
);

export default router;
