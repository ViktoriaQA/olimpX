import { Router } from 'express';
import { AuthRequest, requireRole, authMiddleware } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Get all subscription plans
router.get('/plans', async (req, res, next) => {
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (error) {
      throw createError('Failed to fetch plans', 500);
    }

    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

// Get specific plan
router.get('/plans/:planId', async (req, res, next) => {
  try {
    const { planId } = req.params;

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (error || !plan) {
      throw createError('Plan not found', 404);
    }

    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

// Get current user's subscription status
router.get('/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_plan, subscription_expires_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw createError('Failed to fetch subscription status', 500);
    }

    res.json({
      subscription: {
        status: profile.subscription_status,
        plan: profile.subscription_plan,
        expires_at: profile.subscription_expires_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's payment history
router.get('/payments', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        subscription_plans(name, price_monthly, price_yearly)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError('Failed to fetch payment history', 500);
    }

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

// Get user's subscription history
router.get('/history', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    console.log('📋 [HISTORY] Fetching subscription history for user...');
    const userId = req.user!.id;
    console.log('👤 [HISTORY] User ID:', userId);

    // Get payment attempts from payment_attempts table
    console.log('🔍 [HISTORY] Fetching payment attempts...');
    const { data: paymentAttempts, error: paymentError } = await supabase
      .from('payment_attempts')
      .select(`
        *,
        subscription_plans(name, price_monthly, price_yearly, features)
      `)
      .eq('user_id', userId)
      .in('status', ['completed', 'pending', 'processing', 'initiated'])
      .order('created_at', { ascending: false });

    console.log('💳 [HISTORY] Payment attempts result:', { data: paymentAttempts, error: paymentError });

    if (paymentError) {
      console.error('❌ [HISTORY] Error fetching payment attempts:', paymentError);
    }

    // Get subscription history from user_subscriptions table
    console.log('🔍 [HISTORY] Fetching subscriptions...');
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans(name, price_monthly, price_yearly, features)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('📋 [HISTORY] Subscriptions result:', { data: subscriptions, error: subscriptionError });

    if (subscriptionError) {
      console.error('❌ [HISTORY] Error fetching subscriptions:', subscriptionError);
    }

    // Also check all payment attempts for this user (regardless of status)
    console.log('🔍 [HISTORY] Checking all payment attempts...');
    const { data: allPaymentAttempts, error: allPaymentError } = await supabase
      .from('payment_attempts')
      .select(`
        *,
        subscription_plans(name, price_monthly, price_yearly, features)
      `)
      .eq('user_id', userId);

    console.log('📊 [HISTORY] All payment attempts:', { data: allPaymentAttempts, error: allPaymentError });

    // Get recurring subscriptions for auto-renewal info
    console.log('🔍 [HISTORY] Fetching recurring subscriptions...');
    const { data: recurringSubs, error: recurringError } = await supabase
      .from('recurring_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    console.log('🔄 [HISTORY] Recurring subscriptions:', { data: recurringSubs, error: recurringError });

    // Create a map of subscription_id -> auto_renewal status
    const autoRenewalMap = new Map();
    if (recurringSubs) {
      recurringSubs.forEach(rs => {
        autoRenewalMap.set(rs.subscription_id, {
          enabled: rs.status === 'active' && rs.is_active,
          next_payment_date: rs.next_payment_date,
          failed_attempts: rs.failed_attempts
        });
      });
    }

    console.log('✅ [HISTORY] Found payment attempts:', paymentAttempts);
    console.log('✅ [HISTORY] Found subscriptions:', subscriptions);
    console.log('🔄 [HISTORY] Auto-renewal map created for', autoRenewalMap.size, 'subscriptions');

    // Combine and transform data
    const historyItems: any[] = [];
    
    // Add payment attempts
    if (paymentAttempts) {
      paymentAttempts.forEach(payment => {
        const plan = payment.subscription_plans;
        historyItems.push({
          id: payment.id,
          order_id: payment.order_id,
          plan_name: plan?.name || 'Невідомий план',
          status: payment.status, // Use actual payment status
          start_date: payment.created_at,
          end_date: null,
          price: payment.amount,
          duration: payment.billing_period === 'month' ? 'місяць' : 'рік',
          payment_method: 'Monobank',
          auto_renewal: payment.order_type === 'recurring',
          type: 'payment'
        });
      });
    }

    // Add subscriptions
    if (subscriptions) {
      subscriptions.forEach(subscription => {
        const plan = subscription.subscription_plans;
        const price = plan?.price_monthly || 0;
        
        const startDate = new Date(subscription.start_date);
        const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
        const monthsDiff = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 1;
        const duration = monthsDiff >= 12 ? 'рік' : 'місяць';
        
        // Check if this subscription has auto-renewal enabled
        const autoRenewalInfo = autoRenewalMap.get(subscription.id);
        const autoRenewal = autoRenewalInfo ? {
          enabled: autoRenewalInfo.enabled,
          next_payment_date: autoRenewalInfo.next_payment_date,
          failed_attempts: autoRenewalInfo.failed_attempts
        } : { enabled: false, next_payment_date: null, failed_attempts: 0 };
        
        historyItems.push({
          id: subscription.id,
          plan_name: plan?.name || 'Невідомий план',
          status: subscription.status,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          price: price,
          duration,
          payment_method: 'Monobank',
          auto_renewal: autoRenewal.enabled,
          next_payment_date: autoRenewal.next_payment_date,
          failed_attempts: autoRenewal.failed_attempts,
          type: 'subscription'
        });
      });
    }

    // Sort by date (newest first)
    historyItems.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    console.log('📊 [HISTORY] Combined history:', historyItems);
    console.log('📊 [HISTORY] Final response:', { subscriptionHistory: historyItems });
    res.json({ subscriptionHistory: historyItems });
  } catch (error) {
    console.error('💥 [HISTORY] Unexpected error:', error);
    next(error);
  }
});

// Create payment record (called after successful payment)
router.post('/payments', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { plan_id, amount, currency, order_id, status } = req.body;

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        plan_id,
        amount,
        currency: currency || 'UAH',
        status: status === 'success' ? 'completed' : 'pending',
        order_id
      })
      .select()
      .single();

    if (error) {
      throw createError('Failed to create payment record', 500);
    }

    // If payment is successful, update user subscription
    if (status === 'success') {
      await updateUserSubscription(userId, plan_id);
    }

    res.json({ payment });
  } catch (error) {
    next(error);
  }
});

// Admin: Create new subscription plan
router.post('/plans', async (req: AuthRequest, res, next) => {
  try {
    const { name, description, price_monthly, price_yearly, features, currency } = req.body;

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .insert({
        name,
        description,
        price_monthly,
        price_yearly,
        currency: currency || 'UAH',
        features: features || []
      })
      .select()
      .single();

    if (error) {
      throw createError('Failed to create plan', 500);
    }

    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

// Admin: Update subscription plan
router.put('/plans/:planId', async (req: AuthRequest, res, next) => {
  try {
    const { planId } = req.params;
    const updates = req.body;
    
    // Only allow valid database fields
    const validUpdates: Record<string, any> = {
      name: updates.name,
      description: updates.description,
      price_monthly: updates.price_monthly,
      price_yearly: updates.price_yearly !== null ? updates.price_yearly : 0,
      currency: updates.currency || 'UAH',
      features: updates.features || [],
      is_active: updates.is_active
    };
    
    // Remove undefined values
    Object.keys(validUpdates).forEach(key => {
      if (validUpdates[key] === undefined) {
        delete validUpdates[key];
      }
    });

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .update(validUpdates)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw createError(`Failed to update plan: ${error.message}`, 500);
    }

    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

// Admin: Deactivate plan
router.delete('/plans/:planId', async (req: AuthRequest, res, next) => {
  try {
    const { planId } = req.params;

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .update({ is_active: false })
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      throw createError('Failed to deactivate plan', 500);
    }

    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

// Update auto-renewal settings
router.put('/auto-renewal/:subscriptionId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { subscriptionId } = req.params;
    const { enabled } = req.body;

    console.log('🔄 [AUTO-RENEWAL] Updating auto-renewal settings...');
    console.log('👤 [AUTO-RENEWAL] User ID:', userId);
    console.log('🆔 [AUTO-RENEWAL] Subscription ID:', subscriptionId);
    console.log('🔘 [AUTO-RENEWAL] Enabled:', enabled);

    // Validate input
    if (typeof enabled !== 'boolean') {
      console.log('❌ [AUTO-RENEWAL] Invalid enabled value:', enabled);
      throw createError('enabled must be a boolean', 400);
    }

    // Get the recurring subscription
    const { data: recurringSub, error: fetchError } = await supabase
      .from('recurring_subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.log('❌ [AUTO-RENEWAL] Recurring subscription not found:', fetchError);
      throw createError('Recurring subscription not found', 404);
    }

    console.log('✅ [AUTO-RENEWAL] Found recurring subscription:', recurringSub.id);

    // Update the recurring subscription
    const updateData: any = {
      is_active: enabled,
      status: enabled ? 'active' : 'cancelled',
      updated_at: new Date().toISOString()
    };

    if (!enabled) {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('recurring_subscriptions')
      .update(updateData)
      .eq('id', recurringSub.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [AUTO-RENEWAL] Error updating recurring subscription:', updateError);
      throw createError('Failed to update auto-renewal settings', 500);
    }

    console.log('✅ [AUTO-RENEWAL] Auto-renewal settings updated successfully');
    console.log('📊 [AUTO-RENEWAL] Updated subscription:', updatedSub);

    res.json({
      success: true,
      message: enabled ? 'Auto-renewal enabled' : 'Auto-renewal disabled',
      subscription: updatedSub
    });

  } catch (error) {
    console.error('💥 [AUTO-RENEWAL] Error updating auto-renewal settings:', error);
    next(error);
  }
});

// Get auto-renewal status for a subscription
router.get('/auto-renewal/:subscriptionId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { subscriptionId } = req.params;

    console.log('🔍 [AUTO-RENEWAL] Getting auto-renewal status...');
    console.log('👤 [AUTO-RENEWAL] User ID:', userId);
    console.log('🆔 [AUTO-RENEWAL] Subscription ID:', subscriptionId);

    // Get the recurring subscription
    const { data: recurringSub, error: fetchError } = await supabase
      .from('recurring_subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.log('❌ [AUTO-RENEWAL] Recurring subscription not found:', fetchError);
      return res.json({
        enabled: false,
        message: 'No auto-renewal setup found'
      });
    }

    console.log('✅ [AUTO-RENEWAL] Found recurring subscription:', recurringSub.id);

    res.json({
      enabled: recurringSub.is_active && recurringSub.status === 'active',
      next_payment_date: recurringSub.next_payment_date,
      failed_attempts: recurringSub.failed_attempts,
      status: recurringSub.status,
      subscription: recurringSub
    });

  } catch (error) {
    console.error('💥 [AUTO-RENEWAL] Error getting auto-renewal status:', error);
    next(error);
  }
});

// Helper function to update user subscription
async function updateUserSubscription(userId: string, planId: string) {
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('name')
    .eq('id', planId)
    .single();

  if (plan) {
    // Set subscription to expire in 30 days (monthly) or 365 days (yearly)
    // This is a simplified version - in production you'd check the payment amount
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Default to monthly

    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: plan.name,
        subscription_expires_at: expiresAt.toISOString()
      })
      .eq('user_id', userId);
  }
}

export default router;