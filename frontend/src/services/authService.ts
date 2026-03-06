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
    //console.log('API Call:', { url, endpoint, method: options.method });
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // console.log('API Response:', { 
    //   status: response.status, 
    //   ok: response.ok,
    //   url: response.url 
    // });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('API Error:', error);
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

  static async getDiscordAuthUrl(): Promise<{ auth_url: string }> {
    return this.apiCall<{ auth_url: string }>('/auth/discord/login');
  }

  static async handleGoogleCallback(): Promise<AuthResponse> {
    // This would be handled by the callback route
    throw new Error('Google OAuth callback should be handled by the callback route');
  }

  static async updateProfile(token: string, data: {
    first_name?: string;
    last_name?: string;
    nickname?: string;
    email?: string;
    phone?: string;
  }): Promise<{ user: AuthResponse['user'] }> {
    return this.apiCall<{ user: AuthResponse['user'] }>('/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }
}
