import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

// Registration endpoint
router.post('/register', AuthController.register);

// Login endpoint
router.post('/login', AuthController.login);

// Get current user
router.get('/me', AuthController.getCurrentUser);

// Update user profile
router.put('/profile', AuthController.updateProfile);

// Verify phone
router.post('/verify-phone', AuthController.verifyPhone);

// Verify email
router.post('/verify-email', AuthController.verifyEmail);

// Resend SMS code
router.post('/resend-sms/:phone', AuthController.resendSMS);

// Google OAuth (TODO: implement)
router.get('/google/login', AuthController.googleLogin);
router.get('/google/callback', AuthController.googleCallback);

// Discord OAuth
router.get('/discord/login', AuthController.discordLogin);
router.get('/discord/callback', AuthController.discordCallback);

export default router;
