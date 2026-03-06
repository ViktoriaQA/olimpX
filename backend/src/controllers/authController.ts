import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { JWTService } from '../services/jwtService';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.registerNew(req.body);
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json({ error: message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(401).json({ error: message });
    }
  }

  static async getCurrentUser(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = JWTService.verifyJWT(token);
      
      const user = await AuthService.getCurrentUser(decoded.sub);
      res.status(200).json({ user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get user';
      res.status(401).json({ error: message });
    }
  }

  static async verifyPhone(req: Request, res: Response) {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ error: 'Phone and code are required' });
      }

      const isValid = await AuthService.verifySMSCode(phone, code);
      
      if (isValid) {
        res.status(200).json({ message: 'Phone verified successfully' });
      } else {
        res.status(400).json({ error: 'Invalid or expired verification code' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      res.status(400).json({ error: message });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      const isValid = await AuthService.verifyEmail(token);
      
      if (isValid) {
        res.status(200).json({ message: 'Email verified successfully' });
      } else {
        res.status(400).json({ error: 'Invalid or expired verification token' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      res.status(400).json({ error: message });
    }
  }

  static async resendSMS(req: Request, res: Response) {
    try {
      const { phone } = req.params;
      
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const code = await AuthService.generateSMSVerificationCode(phone);
      
      // TODO: Send actual SMS
      console.log(`SMS verification code for ${phone}: ${code}`);
      
      res.status(200).json({ message: 'Verification code sent' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend code';
      res.status(400).json({ error: message });
    }
  }

  static async googleLogin(req: Request, res: Response) {
    try {
      const result = await AuthService.getGoogleAuthUrl();
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed';
      res.status(500).json({ error: message });
    }
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      const { code, error } = req.query;
      
      // Handle cancelled authentication
      if (error === 'access_denied') {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/`);
      }
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const result = await AuthService.handleGoogleCallback(code);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}?token=${result.token}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google callback failed';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}?error=${encodeURIComponent(message)}`);
    }
  }

  static async discordLogin(req: Request, res: Response) {
    try {
      const result = await AuthService.getDiscordAuthUrl();
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Discord login failed';
      res.status(500).json({ error: message });
    }
  }

  static async discordCallback(req: Request, res: Response) {
    try {
      const { code, error } = req.query;
      
      // Handle cancelled authentication
      if (error === 'access_denied') {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/`);
      }
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const result = await AuthService.handleDiscordCallback(code);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}?token=${result.token}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Discord callback failed';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}?error=${encodeURIComponent(message)}`);
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = JWTService.verifyJWT(token);
      
      const user = await AuthService.updateUserProfile(decoded.sub, req.body);
      res.status(200).json({ user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      res.status(400).json({ error: message });
    }
  }
}
