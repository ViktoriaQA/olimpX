import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - nickname
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User password
 *               nickname:
 *                 type: string
 *                 description: User nickname
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', AuthController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email
 *               password:
 *                 type: string
 *                 description: User password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *                 message:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', AuthController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user
 *     description: Get current authenticated user information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', AuthController.getCurrentUser);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     tags: [Authentication]
 *     summary: Update user profile
 *     description: Update current user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 description: User nickname
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *                 description: Avatar URL
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', AuthController.updateProfile);

/**
 * @swagger
 * /auth/verify-phone:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify phone number
 *     description: Verify user's phone number with SMS code
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               code:
 *                 type: string
 *                 description: SMS verification code
 *     responses:
 *       200:
 *         description: Phone verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid verification code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-phone', AuthController.verifyPhone);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email address
 *     description: Verify user's email address with verification token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid verification token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-email', AuthController.verifyEmail);

/**
 * @swagger
 * /auth/resend-sms/{phone}:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend SMS verification code
 *     description: Resend SMS verification code to the specified phone number
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Phone number
 *     responses:
 *       200:
 *         description: SMS code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid phone number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/resend-sms/:phone', AuthController.resendSMS);

/**
 * @swagger
 * /auth/google/login:
 *   get:
 *     tags: [Authentication]
 *     summary: Google OAuth login
 *     description: Initiate Google OAuth authentication flow
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 *       501:
 *         description: Not implemented
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/google/login', AuthController.googleLogin);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: Google OAuth callback
 *     description: Handle Google OAuth callback
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth authorization code
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: OAuth state parameter
 *     responses:
 *       302:
 *         description: Redirect to frontend with token
 *       501:
 *         description: Not implemented
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/google/callback', AuthController.googleCallback);

/**
 * @swagger
 * /auth/discord/login:
 *   get:
 *     tags: [Authentication]
 *     summary: Discord OAuth login
 *     description: Initiate Discord OAuth authentication flow
 *     responses:
 *       200:
 *         description: Discord OAuth URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: Discord OAuth authorization URL
 */
router.get('/discord/login', AuthController.discordLogin);

/**
 * @swagger
 * /auth/discord/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: Discord OAuth callback
 *     description: Handle Discord OAuth callback
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth authorization code
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: OAuth state parameter
 *     responses:
 *       302:
 *         description: Redirect to frontend with token
 *       400:
 *         description: OAuth callback error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/discord/callback', AuthController.discordCallback);

export default router;
