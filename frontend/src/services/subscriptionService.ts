import { config } from '../config';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  features: string[];
  target_audience: 'student' | 'trainer' | 'all';
  is_popular?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionResponse {
  data: SubscriptionPlan[];
}

export interface InitiateSubscriptionResponse {
  payment_url: string;
  order_id: string;
}

class SubscriptionService {
  private getAuthHeaders() {
    const token = localStorage.getItem(config.auth.tokenKey);
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getPlans(): Promise<SubscriptionResponse> {
    const response = await fetch(`${config.api.baseUrl}/api/subscriptions/plans`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription plans');
    }

    const result = await response.json();
    // Transform backend response to match frontend interface
    return {
      data: result.plans.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price_monthly || plan.price_yearly || 0,
        duration: plan.price_monthly ? 'місяць' : 'рік',
        features: plan.features || [],
        target_audience: plan.target_audience || 'all',
        is_popular: plan.is_popular || false,
        is_active: plan.is_active !== false,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }))
    };
  }

  async getPlan(id: string): Promise<{ data: SubscriptionPlan }> {
    const response = await fetch(`${config.api.baseUrl}/api/subscriptions/plans/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription plan');
    }

    const result = await response.json();
    const plan = result.plan;
    return {
      data: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price_monthly || plan.price_yearly || 0,
        duration: plan.price_monthly ? 'місяць' : 'рік',
        features: plan.features || [],
        target_audience: plan.target_audience || 'all',
        is_popular: plan.is_popular || false,
        is_active: plan.is_active !== false,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }
    };
  }

  async initiateSubscription(planId: string): Promise<InitiateSubscriptionResponse> {
    const response = await fetch(`${config.api.baseUrl}/api/v1/payment/initiate-subscription`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        plan_id: planId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initiate subscription');
    }

    return response.json();
  }

  async getPaymentStatus(orderId: string): Promise<any> {
    const response = await fetch(`${config.api.baseUrl}/api/v1/payment/status/${orderId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get payment status');
    }

    return response.json();
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const response = await fetch(`${config.api.baseUrl}/api/v1/payment/subscriptions/${subscriptionId}/cancel`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  }

  // Admin methods
  async createPlan(planData: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: SubscriptionPlan }> {
    const response = await fetch(`${config.api.baseUrl}/api/subscriptions/plans`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        name: planData.name,
        description: planData.description,
        price_monthly: planData.duration === 'місяць' ? planData.price : null,
        price_yearly: planData.duration === 'рік' ? planData.price : null,
        features: planData.features,
        target_audience: planData.target_audience,
        is_popular: planData.is_popular,
        is_active: planData.is_active,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create subscription plan');
    }

    const result = await response.json();
    const plan = result.plan;
    return {
      data: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price_monthly || plan.price_yearly || 0,
        duration: plan.price_monthly ? 'місяць' : 'рік',
        features: plan.features || [],
        target_audience: plan.target_audience || 'all',
        is_popular: plan.is_popular || false,
        is_active: plan.is_active !== false,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }
    };
  }

  async updatePlan(id: string, planData: Partial<SubscriptionPlan>): Promise<{ data: SubscriptionPlan }> {
    const response = await fetch(`${config.api.baseUrl}/api/subscriptions/plans/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        name: planData.name,
        description: planData.description,
        price_monthly: planData.duration === 'місяць' ? planData.price : null,
        price_yearly: planData.duration === 'рік' ? planData.price : null,
        features: planData.features,
        target_audience: planData.target_audience,
        is_popular: planData.is_popular,
        is_active: planData.is_active,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update subscription plan');
    }

    const result = await response.json();
    const plan = result.plan;
    return {
      data: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price_monthly || plan.price_yearly || 0,
        duration: plan.price_monthly ? 'місяць' : 'рік',
        features: plan.features || [],
        target_audience: plan.target_audience || 'all',
        is_popular: plan.is_popular || false,
        is_active: plan.is_active !== false,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }
    };
  }

  async deletePlan(id: string): Promise<void> {
    const response = await fetch(`${config.api.baseUrl}/api/subscriptions/plans/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete subscription plan');
    }
  }

  async getAllPlansAdmin(): Promise<SubscriptionResponse> {
    const response = await fetch(`${config.api.baseUrl}/api/subscriptions/plans`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription plans');
    }

    const result = await response.json();
    // Transform backend response to match frontend interface
    return {
      data: result.plans.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price_monthly || plan.price_yearly || 0,
        duration: plan.price_monthly ? 'місяць' : 'рік',
        features: plan.features || [],
        target_audience: plan.target_audience || 'all',
        is_popular: plan.is_popular || false,
        is_active: plan.is_active !== false,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }))
    };
  }
}

export const subscriptionService = new SubscriptionService();
