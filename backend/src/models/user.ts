export interface User {
  id: string;
  email?: string;
  country_code?: string;
  phone?: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  role: 'user' | 'admin' | 'student' | 'trainer';
  is_verified: boolean;
  phone_verified: boolean;
  email_verification_token?: string;
  verification_token_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  country_code?: string;
  first_name: string;
  last_name: string;
  password: string;
  role?: 'user' | 'admin' | 'student' | 'trainer';
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash' | 'email_verification_token'>;
  token: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
}

export interface SMSVerificationCode {
  id: string;
  phone: string;
  code: string;
  expires_at: Date;
  attempts: number;
  created_at: Date;
}
