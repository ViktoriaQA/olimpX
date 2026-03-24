import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import { ValidationService } from './validationService';
import { JWTService } from './jwtService';
import { User, RegisterRequest, LoginRequest, AuthResponse, UserSession, SMSVerificationCode } from '../models/user';
import { generateNicknameFromEmail, generateUniqueNickname } from '../utils/nicknameGenerator';
import { OAuth2Client } from 'google-auth-library';
import { TelegramService } from './telegramService';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
);

// Google OAuth configuration
console.log('OAuth2Client initialization:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/google/callback`);

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/google/callback`
);

export class AuthService {
  static async registerNew(userData: RegisterRequest): Promise<AuthResponse> {
    // Validate input
    const validatedData = ValidationService.validateRegister(userData);
    
    // Convert empty strings to undefined for optional fields
    if (validatedData.email === '') validatedData.email = undefined;
    if (validatedData.phone === '') validatedData.phone = undefined;
    if (validatedData.country_code === '') validatedData.country_code = undefined;
    
    // Normalize phone if provided
    if (validatedData.phone) {
      validatedData.phone = ValidationService.normalizePhone(validatedData.phone, validatedData.country_code);
    }

    // Generate nickname from email if email is provided
    let nickname: string | undefined;
    if (validatedData.email) {
      try {
        nickname = generateNicknameFromEmail(validatedData.email);
        
        // Check if nickname already exists and make it unique if needed
        const { data: existingUsers } = await supabase
          .from('custom_users')
          .select('nickname')
          .not('nickname', 'is', null);
        
        const existingNicknames = existingUsers?.map(u => u.nickname).filter(Boolean) || [];
        nickname = generateUniqueNickname(nickname, existingNicknames);
      } catch (error) {
        console.error('Failed to generate nickname from email:', error);
        // Continue without nickname if generation fails
      }
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmailOrPhone(validatedData.email, validatedData.phone);
    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create user in database
    const { data: user, error } = await supabase
      .from('custom_users')
      .insert({
        email: validatedData.email,
        phone: validatedData.phone,
        country_code: validatedData.country_code,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        nickname: nickname,
        password_hash: passwordHash,
        role: validatedData.role || 'student',
        is_verified: false,
        phone_verified: false,
        email_verification_token: validatedData.email ? JWTService.generateSecureToken() : null,
        verification_token_expires_at: validatedData.email ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // 24 hours
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();

    if (error || !user) {
      throw new Error('Failed to create user');
    }

    // Send Telegram notification about new user registration
    try {
      const telegramService = new TelegramService();
      const displayName = user.first_name || user.nickname || user.email;
      await telegramService.sendNewUserNotification(
        user.email || 'N/A',
        displayName
      );
      console.log('📢 [AUTH] New user notification sent to Telegram');
    } catch (telegramError) {
      console.error('❌ [AUTH] Failed to send new user notification to Telegram:', telegramError);
    }

    // Generate SMS verification code if phone provided
    if (validatedData.phone) {
      await this.generateSMSVerificationCode(validatedData.phone);
    }

    // Generate JWT
    const token = JWTService.generateJWT(user.id, user.email, user.role);

    // Save session
    await this.saveUserSession(user.id, token);

    // Send notifications (TODO: implement email/SMS sending)
    if (validatedData.email) {
      console.log(`TODO: Send verification email to ${validatedData.email}`);
    }
    if (validatedData.phone) {
      console.log(`TODO: Send SMS verification code to ${validatedData.phone}`);
    }

    // Return user without sensitive data
    const { password_hash: _, email_verification_token: __, ...userResponse } = user;
    
    return {
      user: userResponse,
      token
    };
  }

  static async login(loginData: LoginRequest): Promise<AuthResponse> {
    const validatedData = ValidationService.validateLogin(loginData);
    
    // Normalize phone if provided
    if (validatedData.phone) {
      validatedData.phone = ValidationService.normalizePhone(validatedData.phone);
    }

    // Find user
    const user = await this.findUserByEmailOrPhone(validatedData.email, validatedData.phone);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    if (!user.password_hash) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const token = JWTService.generateJWT(user.id, user.email, user.role);

    // Save session
    await this.saveUserSession(user.id, token);

    // Return user without sensitive data
    const { password_hash: _, email_verification_token: __, ...userResponse } = user;
    
    return {
      user: userResponse,
      token
    };
  }

  static async getCurrentUser(userId: string): Promise<Omit<User, 'password_hash' | 'email_verification_token'>> {
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    const { password_hash: _, email_verification_token: __, ...userResponse } = user;
    return userResponse;
  }

  static async findUserByEmailOrPhone(email?: string, phone?: string): Promise<User | null> {
    let query = supabase.from('custom_users').select('*');

    if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    } else {
      return null;
    }

    const { data, error } = await query.single();
    
    if (error || !data) {
      return null;
    }

    return data as User;
  }

  static async saveUserSession(userId: string, token: string): Promise<void> {
    const tokenHash = JWTService.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        is_active: true,
        created_at: new Date()
      });

    if (error) {
      console.error('Failed to save session:', error);
      // Don't throw error - user can still login
    }
  }

  static async generateSMSVerificationCode(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing codes for this phone
    await supabase
      .from('sms_verification_codes')
      .delete()
      .eq('phone', phone);

    // Insert new code
    const { error } = await supabase
      .from('sms_verification_codes')
      .insert({
        phone,
        code,
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date()
      });

    if (error) {
      throw new Error('Failed to generate SMS verification code');
    }

    console.log(`SMS verification code for ${phone}: ${code}`);
    return code;
  }

  static async verifySMSCode(phone: string, code: string): Promise<boolean> {
    const { data: verification, error } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .gt('expires_at', new Date())
      .single();

    if (error || !verification) {
      return false;
    }

    // Check attempts
    if (verification.attempts >= 3) {
      await supabase
        .from('sms_verification_codes')
        .delete()
        .eq('id', verification.id);
      return false;
    }

    // Increment attempts
    await supabase
      .from('sms_verification_codes')
      .update({ attempts: verification.attempts + 1 })
      .eq('id', verification.id);

    // Mark phone as verified
    await supabase
      .from('custom_users')
      .update({ phone_verified: true, updated_at: new Date() })
      .eq('phone', phone);

    // Delete verification code
    await supabase
      .from('sms_verification_codes')
      .delete()
      .eq('id', verification.id);

    return true;
  }

  static async verifyEmail(token: string): Promise<boolean> {
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('*')
      .eq('email_verification_token', token)
      .gt('verification_token_expires_at', new Date())
      .single();

    if (error || !user) {
      return false;
    }

    // Mark email as verified
    const { error: updateError } = await supabase
      .from('custom_users')
      .update({ 
        is_verified: true, 
        email_verification_token: null,
        verification_token_expires_at: null,
        updated_at: new Date()
      })
      .eq('id', user.id);

    if (updateError) {
      return false;
    }

    return true;
  }

  static async updateUserProfile(userId: string, updateData: {
    first_name?: string;
    last_name?: string;
    nickname?: string;
    email?: string;
    phone?: string;
  }): Promise<Omit<User, 'password_hash' | 'email_verification_token'>> {
    // Filter out empty values (undefined, null, or empty strings)
    const filteredData = Object.entries(updateData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key as keyof typeof updateData] = value;
      }
      return acc;
    }, {} as Partial<typeof updateData>);

    if (Object.keys(filteredData).length === 0) {
      throw new Error('At least one field must be provided for update');
    }

    // Validate input
    const validatedData = ValidationService.validateProfileUpdate(filteredData);
    
    // Normalize phone if provided
    if (validatedData.phone) {
      validatedData.phone = ValidationService.normalizePhone(validatedData.phone);
    }

    // Check if email or phone is already taken by another user
    if (validatedData.email || validatedData.phone) {
      const existingUser = await this.findUserByEmailOrPhone(validatedData.email, validatedData.phone);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email or phone is already taken by another user');
      }
    }

    // Update user in database
    const { data: user, error } = await supabase
      .from('custom_users')
      .update({
        ...validatedData,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error || !user) {
      throw new Error('Failed to update profile');
    }

    const { password_hash: _, email_verification_token: __, ...userResponse } = user;
    return userResponse;
  }

  static async getGoogleAuthUrl(): Promise<{ auth_url: string }> {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth is not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    console.log('Environment variables:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'set' : 'not set');
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/google/callback`;
    
    console.log('Google OAuth redirect URI:', redirectUri);
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      redirect_uri: redirectUri
    });

    return { auth_url: authUrl };
  }

  static async handleGoogleCallback(code: string): Promise<AuthResponse> {
    try {
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/google/callback`;
      
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken({
        code,
        redirect_uri: redirectUri
      });
      oauth2Client.setCredentials(tokens);

      // Get user info from Google
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Failed to get user information from Google');
      }

      const googleEmail = payload.email;
      const googleFirstName = payload.given_name || '';
      const googleLastName = payload.family_name || '';

      // Check if user already exists
      let user = await this.findUserByEmailOrPhone(googleEmail);

      if (!user) {
        // Create new user
        let nickname: string | undefined;
        try {
          nickname = generateNicknameFromEmail(googleEmail);
          
          // Check if nickname already exists and make it unique if needed
          const { data: existingUsers } = await supabase
            .from('custom_users')
            .select('nickname')
            .not('nickname', 'is', null);
          
          const existingNicknames = existingUsers?.map(u => u.nickname).filter(Boolean) || [];
          nickname = generateUniqueNickname(nickname, existingNicknames);
        } catch (error) {
          console.error('Failed to generate nickname from email:', error);
        }

        // Create user in database
        const { data: newUser, error } = await supabase
          .from('custom_users')
          .insert({
            email: googleEmail,
            first_name: googleFirstName,
            last_name: googleLastName,
            nickname: nickname,
            role: 'student',
            is_verified: true, // Google users are pre-verified
            phone_verified: false,
            created_at: new Date(),
            updated_at: new Date()
          })
          .select()
          .single();

        if (error || !newUser) {
          throw new Error('Failed to create Google user');
        }

        // Send Telegram notification about new Google user registration
        try {
          const telegramService = new TelegramService();
          const displayName = newUser.first_name || newUser.nickname || newUser.email;
          await telegramService.sendNewUserNotification(
            newUser.email,
            `${displayName} (Google OAuth)`
          );
          console.log('📢 [AUTH] New Google user notification sent to Telegram');
        } catch (telegramError) {
          console.error('❌ [AUTH] Failed to send new Google user notification to Telegram:', telegramError);
        }

        user = newUser;
      } else {
        // Update existing user's Google info
        const { data: updatedUser, error } = await supabase
          .from('custom_users')
          .update({
            first_name: googleFirstName || user.first_name,
            last_name: googleLastName || user.last_name,
            is_verified: true, // Mark as verified if using Google
            updated_at: new Date()
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error || !updatedUser) {
          throw new Error('Failed to update Google user');
        }

        user = updatedUser;
      }

      // Ensure user is not null at this point
      if (!user) {
        throw new Error('User initialization failed');
      }

      // Generate JWT
      const token = JWTService.generateJWT(user.id, user.email!, user.role);

      // Save session
      await this.saveUserSession(user.id, token);

      // Return user without sensitive data
      const { password_hash: _, email_verification_token: __, ...userResponse } = user;
      
      return {
        user: userResponse,
        token
      };

    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  static async getDiscordAuthUrl(): Promise<{ auth_url: string }> {
    if (!process.env.DISCORD_CLIENT_ID) {
      throw new Error('Discord OAuth is not configured');
    }

    const scopes = ['identify', 'email'];
    const redirectUri = process.env.DISCORD_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/discord/callback`;
    
    const authUrl = `https://discord.com/api/oauth2/authorize?` +
      `client_id=${process.env.DISCORD_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scopes.join('%20')}`;

    return { auth_url: authUrl };
  }

  static async handleDiscordCallback(code: string): Promise<AuthResponse> {
    try {
      const redirectUri = process.env.DISCORD_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/discord/callback`;
      
      // Exchange code for access token
      const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
        new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID!,
          client_secret: process.env.DISCORD_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user info from Discord
      const discordUserResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const discordUser = discordUserResponse.data;
      
      if (!discordUser.email) {
        throw new Error('Discord user email is required');
      }

      const discordEmail = discordUser.email;
      const discordUsername = discordUser.username;
      const discordDiscriminator = discordUser.discriminator;
      const discordAvatar = discordUser.avatar;

      // Check if user already exists
      let user = await this.findUserByEmailOrPhone(discordEmail);

      if (!user) {
        // Create new user
        let nickname: string | undefined;
        try {
          nickname = `${discordUsername}#${discordDiscriminator}`;
          
          // Check if nickname already exists and make it unique if needed
          const { data: existingUsers } = await supabase
            .from('custom_users')
            .select('nickname')
            .not('nickname', 'is', null);
          
          const existingNicknames = existingUsers?.map(u => u.nickname).filter(Boolean) || [];
          nickname = generateUniqueNickname(nickname, existingNicknames);
        } catch (error) {
          console.error('Failed to generate nickname from Discord:', error);
        }

        // Create user in database
        const { data: newUser, error } = await supabase
          .from('custom_users')
          .insert({
            email: discordEmail,
            nickname: nickname,
            role: 'student',
            is_verified: true, // Discord users are pre-verified
            phone_verified: false,
            avatar_url: discordAvatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordAvatar}.png` : null,
            created_at: new Date(),
            updated_at: new Date()
          })
          .select()
          .single();

        if (error || !newUser) {
          throw new Error('Failed to create Discord user');
        }

        // Send Telegram notification about new Discord user registration
        try {
          const telegramService = new TelegramService();
          const displayName = newUser.nickname || newUser.email;
          await telegramService.sendNewUserNotification(
            newUser.email,
            `${displayName} (Discord OAuth)`
          );
          console.log('📢 [AUTH] New Discord user notification sent to Telegram');
        } catch (telegramError) {
          console.error('❌ [AUTH] Failed to send new Discord user notification to Telegram:', telegramError);
        }

        user = newUser;
      } else {
        // Update existing user's Discord info
        const { data: updatedUser, error } = await supabase
          .from('custom_users')
          .update({
            nickname: user.nickname || `${discordUsername}#${discordDiscriminator}`,
            is_verified: true, // Mark as verified if using Discord
            avatar_url: discordAvatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordAvatar}.png` : user.avatar_url,
            updated_at: new Date()
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error || !updatedUser) {
          throw new Error('Failed to update Discord user');
        }

        user = updatedUser;
      }

      // Ensure user is not null at this point
      if (!user) {
        throw new Error('User initialization failed');
      }

      // Generate JWT
      const token = JWTService.generateJWT(user.id, user.email!, user.role);

      // Save session
      await this.saveUserSession(user.id, token);

      // Return user without sensitive data
      const { password_hash: _, email_verification_token: __, ...finalUserResponse } = user;
      
      return {
        user: finalUserResponse,
        token
      };

    } catch (error) {
      console.error('Discord OAuth callback error:', error);
      throw new Error('Failed to authenticate with Discord');
    }
  }
}
