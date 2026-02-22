import { config } from '@/config';

export interface RegisterData {
  email?: string;
  phone?: string;
  country_code?: string;
  first_name: string;
  last_name: string;
  password: string;
  role?: string;
}

export interface LoginData {
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email?: string;
    phone?: string;
    first_name: string;
    last_name: string;
    role: string;
    is_verified: boolean;
    phone_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  token: string;
}

export class AuthService {
  private static async apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${config.api.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async register(data: RegisterData): Promise<AuthResponse> {
    return this.apiCall<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async login(data: LoginData): Promise<AuthResponse> {
    return this.apiCall<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getCurrentUser(token: string): Promise<{ user: AuthResponse['user'] }> {
    return this.apiCall<{ user: AuthResponse['user'] }>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  static async verifyPhone(phone: string, code: string): Promise<void> {
    await this.apiCall('/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  static async verifyEmail(token: string): Promise<void> {
    await this.apiCall('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  static async resendSMS(phone: string): Promise<void> {
    await this.apiCall(`/auth/resend-sms/${phone}`, {
      method: 'POST',
    });
  }

  static async getGoogleAuthUrl(): Promise<{ auth_url: string }> {
    return this.apiCall<{ auth_url: string }>('/auth/google/login');
  }

  static handleGoogleCallback(): Promise<AuthResponse> {
    // This would be handled by the callback route
    throw new Error('Google OAuth callback should be handled by the callback route');
  }
}
