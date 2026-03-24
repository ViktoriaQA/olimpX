import { config } from '@/config';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  role: 'user' | 'admin' | 'student' | 'trainer';
  is_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  subscription?: {
    plan: string;
    status: string;
    expires_at?: string;
    features: string[];
    subscription_id?: string;
    auto_renew?: boolean;
    payment_id?: string;
    order_id?: string;
  };
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class UserManagementService {
  private static async apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${config.api.baseUrl}${endpoint}`;
    const token = localStorage.getItem(config.auth.tokenKey);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('API Error:', error);
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async getUsers(page: number = 1, limit: number = 20): Promise<UsersResponse> {
    return this.apiCall<UsersResponse>(`/api/users/admin/all?page=${page}&limit=${limit}`);
  }

  static async updateUserRole(userId: string, role: string): Promise<{ user: { id: string; role: string } }> {
    return this.apiCall<{ user: { id: string; role: string } }>(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  static async cancelUserSubscription(userId: string): Promise<{ message: string; user: { id: string; email: string } }> {
    return this.apiCall<{ message: string; user: { id: string; email: string } }>(`/api/users/admin/${userId}/cancel-subscription`, {
      method: 'POST',
    });
  }

  static async cleanupUserSubscriptions(userId: string, keepLatest: boolean = true): Promise<{ 
    message: string; 
    results: {
      deletedSubscriptions: number;
      deletedPaymentAttempts: number;
      deletedRecurringSubscriptions: number;
      updatedProfiles: number;
      errors: string[];
    }
  }> {
    return this.apiCall<any>(`/api/admin/cleanup/subscriptions`, {
      method: 'POST',
      body: JSON.stringify({ userId, keepLatest }),
    });
  }

  static async deleteUser(userId: string): Promise<{ message: string; user: { id: string; email: string; role: string } }> {
    return this.apiCall<{ message: string; user: { id: string; email: string; role: string } }>(`/api/users/admin/${userId}`, {
      method: 'DELETE',
    });
  }
}
