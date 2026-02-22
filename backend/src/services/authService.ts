import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import { ValidationService } from './validationService';
import { JWTService } from './jwtService';
import { User, RegisterRequest, LoginRequest, AuthResponse, UserSession, SMSVerificationCode } from '../models/user';
import { generateNicknameFromEmail, generateUniqueNickname } from '../utils/nicknameGenerator';

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
);

export class AuthService {
  static async registerNew(userData: RegisterRequest): Promise<AuthResponse> {
    // Validate input
    const validatedData = ValidationService.validateRegister(userData);
    
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
}
