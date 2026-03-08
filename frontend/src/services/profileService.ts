import { config } from '@/config';

export interface ProfileData {
  nickname?: string;
  avatar_url?: string;
}

export interface UserStats {
  tournaments_count: number;
  tasks_count: number;
  achievements_count: number;
  recent_activity: Array<{
    type: 'tournament' | 'task' | 'achievement';
    title: string;
    date: string;
    description?: string;
  }>;
}

export interface SubscriptionInfo {
  plan: string;
  status: string;
  expires_at?: string;
  features: string[];
}

export class ProfileService {
  private static async apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem(config.auth.tokenKey);
    const url = `${config.api.baseUrl}/api/users${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
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

  static async getProfile(): Promise<{ profile: any }> {
    return this.apiCall<{ profile: any }>('/profile');
  }

  static async updateProfile(data: ProfileData): Promise<{ profile: any }> {
    return this.apiCall<{ profile: any }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async getUserStats(): Promise<UserStats> {
    return this.apiCall<UserStats>('/stats');
  }

  static async getSubscriptionInfo(): Promise<{ subscription: SubscriptionInfo }> {
    return this.apiCall<{ subscription: SubscriptionInfo }>('/subscription');
  }

  static async getRole(): Promise<{ role: string }> {
    return this.apiCall<{ role: string }>('/role');
  }
}
