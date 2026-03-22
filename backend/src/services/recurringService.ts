import { Subscription, PaymentAttempt } from '../models/subscription';

export class RecurringService {
  // This would typically interact with your database
  // For now, I'll provide the interface and basic structure

  async createRecurringSubscription(
    userId: string,
    packageId: string,
    invoiceId: string,
    token?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Subscription> {
    try {
      console.log('🔄 [RECURRING] Creating recurring subscription...');
      console.log('👤 [RECURRING] User ID:', userId);
      console.log('📦 [RECURRING] Package ID:', packageId);
      console.log('📄 [RECURRING] Invoice ID:', invoiceId);
      console.log('🔑 [RECURRING] Has token:', !!token);
      console.log('📅 [RECURRING] Start date:', startDate || new Date());
      console.log('📅 [RECURRING] End date:', endDate || this.calculateEndDate(startDate || new Date(), 1));
      
      // Implementation would save subscription to database
      const subscription: Subscription = {
        id: this.generateId(),
        user_id: userId,
        package_id: packageId,
        status: 'active',
        start_date: startDate || new Date(),
        end_date: endDate || this.calculateEndDate(startDate || new Date(), 1), // Default 1 month
        auto_renew: true,
        monobank_invoice_id: invoiceId,
        monobank_token: token,
        payment_gateway: 'monobank',
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log('📝 [RECURRING] Subscription object created:', JSON.stringify(subscription, null, 2));
      
      // Save to database here
      await this.saveSubscription(subscription);
      console.log('✅ [RECURRING] Subscription saved to database');
      
      console.log('🎉 [RECURRING] Recurring subscription created successfully');
      return subscription;
    } catch (error) {
      console.error('💥 [RECURRING] Error creating recurring subscription:', error);
      console.error('💥 [RECURRING] Error details:', {
        userId,
        packageId,
        invoiceId,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }

  async cancelRecurringSubscription(
    subscriptionId: string,
    userId: string
  ): Promise<boolean> {
    try {
      console.log('🚫 [RECURRING] Cancelling recurring subscription...');
      console.log('🆔 [RECURRING] Subscription ID:', subscriptionId);
      console.log('👤 [RECURRING] User ID:', userId);
      
      // Verify user owns the subscription
      console.log('🔍 [RECURRING] Verifying subscription ownership...');
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription || subscription.user_id !== userId) {
        console.log('❌ [RECURRING] Subscription not found or access denied');
        console.log('❌ [RECURRING] Subscription exists:', !!subscription);
        console.log('❌ [RECURRING] User ID match:', subscription?.user_id === userId);
        throw new Error('Subscription not found or access denied');
      }

      console.log('✅ [RECURRING] Subscription ownership verified');
      console.log('📊 [RECURRING] Current subscription status:', subscription.status);
      console.log('🔄 [RECURRING] Current auto_renew setting:', subscription.auto_renew);

      // Update subscription status
      subscription.status = 'cancelled';
      subscription.auto_renew = false;
      subscription.updated_at = new Date();
      
      console.log('📝 [RECURRING] Updated subscription status to cancelled');

      // Save to database
      await this.updateSubscription(subscription);
      console.log('✅ [RECURRING] Subscription updated in database');

      console.log('🎉 [RECURRING] Subscription cancelled successfully');
      return true;
    } catch (error) {
      console.error('💥 [RECURRING] Error cancelling recurring subscription:', error);
      console.error('💥 [RECURRING] Error details:', {
        subscriptionId,
        userId,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'active' | 'expired' | 'cancelled' | 'pending'
  ): Promise<void> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = status;
    subscription.updated_at = new Date();

    await this.updateSubscription(subscription);
  }

  async extendSubscription(
    subscriptionId: string,
    months: number
  ): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Calculate new end date
    const currentEndDate = new Date(subscription.end_date);
    const newEndDate = this.calculateEndDate(currentEndDate, months);

    subscription.end_date = newEndDate;
    subscription.status = 'active';
    subscription.updated_at = new Date();

    await this.updateSubscription(subscription);
    return subscription;
  }

  async getUserActiveSubscriptions(userId: string): Promise<Subscription[]> {
    // Implementation would fetch from database
    // For now, return empty array
    return [];
  }

  async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    // Implementation would fetch from database
    // For now, return null
    return null;
  }

  async processRecurringPayment(
    subscriptionId: string,
    invoiceId: string,
    amount: number
  ): Promise<void> {
    try {
      console.log('💳 [RECURRING] Processing recurring payment...');
      console.log('🆔 [RECURRING] Subscription ID:', subscriptionId);
      console.log('📄 [RECURRING] Invoice ID:', invoiceId);
      console.log('💰 [RECURRING] Amount:', amount);
      console.log('⏰ [RECURRING] Processing time:', new Date().toISOString());
      
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        console.log('❌ [RECURRING] Subscription not found');
        throw new Error('Subscription not found');
      }

      console.log('✅ [RECURRING] Subscription found');
      console.log('📊 [RECURRING] Current status:', subscription.status);
      console.log('🔄 [RECURRING] Auto renew enabled:', subscription.auto_renew);
      console.log('📅 [RECURRING] Current end date:', subscription.end_date);

      if (subscription.status !== 'active' || !subscription.auto_renew) {
        console.log('❌ [RECURRING] Subscription is not active for renewal');
        console.log('❌ [RECURRING] Status check:', {
          isActive: subscription.status === 'active',
          autoRenew: subscription.auto_renew,
          status: subscription.status
        });
        throw new Error('Subscription is not active for renewal');
      }

      console.log('✅ [RECURRING] Subscription is eligible for renewal');
      
      // Extend subscription by one billing cycle
      console.log('📅 [RECURRING] Extending subscription by 1 month...');
      await this.extendSubscription(subscriptionId, 1);
      console.log('✅ [RECURRING] Subscription extended successfully');

      // Log the payment
      console.log('📝 [RECURRING] Logging recurring payment...');
      await this.logRecurringPayment(subscriptionId, invoiceId, amount);
      console.log('✅ [RECURRING] Recurring payment logged');
      
      console.log('🎉 [RECURRING] Recurring payment processed successfully');
    } catch (error) {
      console.error('💥 [RECURRING] Error processing recurring payment:', error);
      console.error('💥 [RECURRING] Error details:', {
        subscriptionId,
        invoiceId,
        amount,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }

  async checkExpiringSubscriptions(): Promise<Subscription[]> {
    // Find subscriptions expiring in next 3 days
    // Implementation would query database
    return [];
  }

  async handleFailedRenewal(subscriptionId: string, reason: string): Promise<void> {
    try {
      console.log('❌ [RECURRING] Handling failed renewal...');
      console.log('🆔 [RECURRING] Subscription ID:', subscriptionId);
      console.log('📝 [RECURRING] Failure reason:', reason);
      console.log('⏰ [RECURRING] Failure time:', new Date().toISOString());
      
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        console.log('❌ [RECURRING] Subscription not found for failed renewal handling');
        return;
      }

      console.log('✅ [RECURRING] Subscription found for failure handling');
      console.log('📊 [RECURRING] Current status:', subscription.status);
      console.log('🔄 [RECURRING] Auto renew setting:', subscription.auto_renew);

      // Log the failure
      console.log('📝 [RECURRING] Logging renewal failure...');
      await this.logRenewalFailure(subscriptionId, reason);
      console.log('✅ [RECURRING] Renewal failure logged');

      // If multiple failures, consider cancelling
      console.log('🔍 [RECURRING] Checking renewal failure count...');
      const failureCount = await this.getRenewalFailureCount(subscriptionId);
      console.log('📊 [RECURRING] Current failure count:', failureCount);
      
      if (failureCount >= 3) {
        console.log('🚫 [RECURRING] Maximum failures reached, cancelling subscription...');
        subscription.status = 'expired';
        subscription.auto_renew = false;
        subscription.updated_at = new Date();
        
        await this.updateSubscription(subscription);
        console.log('✅ [RECURRING] Subscription cancelled due to multiple failures');
        console.log('📢 [RECURRING] User should be notified about subscription cancellation');
      } else {
        console.log('⏳ [RECURRING] Subscription still active, will retry later');
        console.log('📊 [RECURRING] Failures remaining before cancellation:', 3 - failureCount);
      }
      
      console.log('🎯 [RECURRING] Failed renewal handling completed');
    } catch (error) {
      console.error('💥 [RECURRING] Error handling failed renewal:', error);
      console.error('💥 [RECURRING] Error details:', {
        subscriptionId,
        reason,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    }
  }

  private generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateEndDate(startDate: Date, months: number): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    return endDate;
  }

  private async saveSubscription(subscription: Subscription): Promise<void> {
    // Database implementation would go here
    console.log('Saving subscription:', subscription.id);
  }

  private async updateSubscription(subscription: Subscription): Promise<void> {
    // Database implementation would go here
    console.log('Updating subscription:', subscription.id);
  }

  private async logRecurringPayment(
    subscriptionId: string,
    invoiceId: string,
    amount: number
  ): Promise<void> {
    // Log payment for audit trail
    console.log(`Recurring payment logged: ${subscriptionId}, ${invoiceId}, ${amount}`);
  }

  private async logRenewalFailure(
    subscriptionId: string,
    reason: string
  ): Promise<void> {
    // Log renewal failure
    console.log(`Renewal failure logged: ${subscriptionId}, ${reason}`);
  }

  private async getRenewalFailureCount(subscriptionId: string): Promise<number> {
    // Get count of recent failures for this subscription
    // Database implementation would go here
    return 0;
  }
}

export default RecurringService;
