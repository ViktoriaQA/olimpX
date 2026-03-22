import dotenv from 'dotenv';
import path from 'path';
import { supabase } from '../utils/supabase';
import MonobankService from '../services/monobankService';
import { PaymentRequest } from '../models/subscription';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface RecurringSubscription {
  id: string;
  user_id: string;
  package_id: string;
  subscription_id: string;
  payment_id: string;
  rec_token: string;
  status: string;
  billing_period: string;
  amount: number;
  currency: string;
  last_payment_date: string;
  next_payment_date: string;
  failed_attempts: number;
  is_active: boolean;
}

interface PackageDetails {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
}

class AutomaticRenewalProcessor {
  private monobankService: MonobankService;

  constructor() {
    this.monobankService = new MonobankService();
  }

  async processDueRenewals(): Promise<void> {
    try {
      console.log('🔄 [RENEWAL] Starting automatic renewal processing...');
      console.log('⏰ [RENEWAL] Current time:', new Date().toISOString());

      // Get subscriptions due for renewal
      const dueSubscriptions = await this.getSubscriptionsDueForRenewal();
      
      if (dueSubscriptions.length === 0) {
        console.log('✅ [RENEWAL] No subscriptions due for renewal');
        return;
      }

      console.log(`📊 [RENEWAL] Found ${dueSubscriptions.length} subscriptions due for renewal`);

      // Process each subscription
      for (const subscription of dueSubscriptions) {
        try {
          await this.processSubscriptionRenewal(subscription);
        } catch (error) {
          console.error(`💥 [RENEWAL] Failed to process renewal for subscription ${subscription.id}:`, error);
          await this.handleRenewalFailure(subscription, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      console.log('🎉 [RENEWAL] Automatic renewal processing completed');
    } catch (error) {
      console.error('💥 [RENEWAL] Critical error in renewal processing:', error);
      throw error;
    }
  }

  private async getSubscriptionsDueForRenewal(): Promise<RecurringSubscription[]> {
    try {
      console.log('🔍 [RENEWAL] Fetching subscriptions due for renewal...');

      const { data: subscriptions, error } = await supabase
        .from('recurring_subscriptions')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'active')
        .lte('next_payment_date', new Date().toISOString())
        .lt('failed_attempts', 3)
        .order('next_payment_date', { ascending: true });

      if (error) {
        console.error('❌ [RENEWAL] Error fetching due subscriptions:', error);
        throw error;
      }

      console.log(`✅ [RENEWAL] Found ${subscriptions?.length || 0} subscriptions due for renewal`);
      return subscriptions || [];
    } catch (error) {
      console.error('💥 [RENEWAL] Error getting subscriptions due for renewal:', error);
      throw error;
    }
  }

  private async processSubscriptionRenewal(subscription: RecurringSubscription): Promise<void> {
    try {
      console.log(`🔄 [RENEWAL] Processing renewal for subscription: ${subscription.id}`);
      console.log(`👤 [RENEWAL] User ID: ${subscription.user_id}`);
      console.log(`💰 [RENEWAL] Amount: ${subscription.amount} ${subscription.currency}`);
      console.log(`⏰ [RENEWAL] Billing period: ${subscription.billing_period}`);

      // Get package details
      const packageDetails = await this.getPackageDetails(subscription.package_id);
      if (!packageDetails) {
        throw new Error(`Package not found: ${subscription.package_id}`);
      }

      console.log(`📦 [RENEWAL] Package: ${packageDetails.name}`);

      // Generate new order ID for renewal
      const newOrderId = `renew_${subscription.user_id}_${Date.now()}`;
      console.log(`🆔 [RENEWAL] New order ID: ${newOrderId}`);

      // Create renewal payment request using saved token
      const paymentRequest: PaymentRequest = {
        order_id: newOrderId,
        amount: subscription.amount,
        currency: subscription.currency,
        description: `Автоматичне продовження підписки за пакет '${packageDetails.name}'`,
        order_type: 'recurring',
        customer: subscription.user_id,
        product_name: packageDetails.name,
        product_description: packageDetails.description,
        product_price: subscription.amount,
      };

      console.log('💳 [RENEWAL] Creating renewal payment with Monobank...');

      // For automatic renewal, we'll use the token to charge the card
      // This is a simplified version - in production you'd use Monobank's recurring charge API
      const renewalSuccess = await this.processTokenCharge(subscription, paymentRequest);

      if (renewalSuccess) {
        await this.handleSuccessfulRenewal(subscription, newOrderId, packageDetails);
      } else {
        throw new Error('Token charge failed');
      }

    } catch (error) {
      console.error(`💥 [RENEWAL] Error processing renewal for ${subscription.id}:`, error);
      throw error;
    }
  }

  private async processTokenCharge(subscription: RecurringSubscription, paymentRequest: PaymentRequest): Promise<boolean> {
    try {
      console.log('🔑 [RENEWAL] Processing token-based charge...');
      console.log(`💳 [RENEWAL] Token length: ${subscription.rec_token.length}`);

      // Note: This is a simplified implementation
      // In production, you would use Monobank's recurring charge API with the saved token
      // For now, we'll simulate a successful charge and log it
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Log the charge attempt
      console.log('📝 [RENEWAL] Token charge logged:', {
        subscriptionId: subscription.id,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        token: subscription.rec_token.substring(0, 10) + '...'
      });

      // Return true to simulate successful charge
      // In production, this would be the actual API response
      return true;

    } catch (error) {
      console.error('💥 [RENEWAL] Token charge failed:', error);
      return false;
    }
  }

  private async handleSuccessfulRenewal(
    subscription: RecurringSubscription, 
    newOrderId: string, 
    packageDetails: PackageDetails
  ): Promise<void> {
    try {
      console.log(`✅ [RENEWAL] Renewal successful for subscription: ${subscription.id}`);

      // Extend the user's subscription
      const durationMonths = subscription.billing_period === 'month' ? 1 : 12;
      await this.extendUserSubscription(subscription.user_id, subscription.package_id, durationMonths);

      // Update recurring subscription record
      const nextPaymentDate = new Date();
      if (subscription.billing_period === 'month') {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else {
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
      }

      const { error: updateError } = await supabase
        .from('recurring_subscriptions')
        .update({
          last_payment_date: new Date().toISOString(),
          next_payment_date: nextPaymentDate.toISOString(),
          failed_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('❌ [RENEWAL] Error updating recurring subscription:', updateError);
        throw updateError;
      }

      // Log the successful renewal
      await this.logRenewalEvent(subscription.user_id, subscription.id, newOrderId, 'success', subscription.amount);

      console.log(`🎉 [RENEWAL] Subscription ${subscription.id} renewed successfully`);
      console.log(`📅 [RENEWAL] Next payment date: ${nextPaymentDate.toISOString()}`);

    } catch (error) {
      console.error('💥 [RENEWAL] Error handling successful renewal:', error);
      throw error;
    }
  }

  private async extendUserSubscription(userId: string, packageId: string, durationMonths: number): Promise<void> {
    try {
      console.log(`📅 [RENEWAL] Extending subscription for user ${userId} by ${durationMonths} months`);

      // Get current subscription
      const { data: currentSub, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('package_id', packageId)
        .eq('status', 'active')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ [RENEWAL] Error fetching current subscription:', fetchError);
        throw fetchError;
      }

      const newEndDate = new Date();
      if (currentSub && currentSub.end_date && new Date(currentSub.end_date) > new Date()) {
        // Extend from current end date
        newEndDate.setTime(new Date(currentSub.end_date).getTime());
      }
      newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

      if (currentSub) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            end_date: newEndDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSub.id);

        if (updateError) {
          console.error('❌ [RENEWAL] Error updating subscription:', updateError);
          throw updateError;
        }
      } else {
        // Create new subscription
        const startDate = new Date();
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            package_id: packageId,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: newEndDate.toISOString(),
            created_at: startDate.toISOString(),
            updated_at: startDate.toISOString()
          });

        if (insertError) {
          console.error('❌ [RENEWAL] Error creating subscription:', insertError);
          throw insertError;
        }
      }

      // Update user profile
      const { data: packageData } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', packageId)
        .single();

      const { error: profileUpdateError } = await supabase
        .from('custom_users')
        .update({
          subscription_status: 'active',
          subscription_plan: packageData?.name || 'Unknown',
          subscription_expires_at: newEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('❌ [RENEWAL] Error updating user profile:', profileUpdateError);
        throw profileUpdateError;
      }

      console.log(`✅ [RENEWAL] Subscription extended for user ${userId} until ${newEndDate.toISOString()}`);

    } catch (error) {
      console.error('💥 [RENEWAL] Error extending user subscription:', error);
      throw error;
    }
  }

  private async handleRenewalFailure(subscription: RecurringSubscription, errorMessage: string): Promise<void> {
    try {
      console.log(`❌ [RENEWAL] Handling renewal failure for subscription: ${subscription.id}`);
      console.log(`📝 [RENEWAL] Error: ${errorMessage}`);

      // Increment failed attempts
      const newFailedAttempts = subscription.failed_attempts + 1;
      
      const updateData: any = {
        failed_attempts: newFailedAttempts,
        updated_at: new Date().toISOString()
      };

      // If max attempts reached, deactivate subscription
      if (newFailedAttempts >= 3) {
        updateData.status = 'expired';
        updateData.is_active = false;
        console.log(`🚫 [RENEWAL] Max failed attempts reached, deactivating subscription ${subscription.id}`);
      }

      const { error: updateError } = await supabase
        .from('recurring_subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.error('❌ [RENEWAL] Error updating failed subscription:', updateError);
        throw updateError;
      }

      // Log the failure
      await this.logRenewalEvent(subscription.user_id, subscription.id, '', 'failure', subscription.amount, errorMessage);

      console.log(`📊 [RENEWAL] Subscription ${subscription.id} updated: attempts=${newFailedAttempts}, active=${updateData.is_active !== false}`);

    } catch (error) {
      console.error('💥 [RENEWAL] Error handling renewal failure:', error);
      throw error;
    }
  }

  private async getPackageDetails(packageId: string): Promise<PackageDetails | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', packageId)
        .single();

      if (error) {
        console.error('❌ [RENEWAL] Error fetching package details:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('💥 [RENEWAL] Error getting package details:', error);
      return null;
    }
  }

  private async logRenewalEvent(
    userId: string,
    subscriptionId: string,
    orderId: string,
    status: 'success' | 'failure',
    amount: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const logEntry = {
        user_id: userId,
        subscription_id: subscriptionId,
        order_id: orderId,
        event_type: 'renewal',
        status: status,
        amount: amount,
        error_message: errorMessage || null,
        created_at: new Date().toISOString()
      };

      console.log('📝 [RENEWAL] Logging renewal event:', logEntry);

      // In a production system, you might want to store this in a separate logs table
      // For now, we'll just log it to console
      console.log(`📊 [RENEWAL] Event logged: ${status} renewal for user ${userId}, amount ${amount}`);

    } catch (error) {
      console.error('💥 [RENEWAL] Error logging renewal event:', error);
      // Don't throw - logging failure shouldn't break the renewal process
    }
  }
}

// Run the processor if this script is executed directly
async function main(): Promise<void> {
  try {
    const processor = new AutomaticRenewalProcessor();
    await processor.processDueRenewals();
    console.log('✅ [RENEWAL] Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 [RENEWAL] Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { AutomaticRenewalProcessor };
