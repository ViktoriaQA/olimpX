import dotenv from 'dotenv';
import path from 'path';
import { supabase } from '../utils/supabase';
import { AutomaticRenewalProcessor } from './processAutomaticRenewals';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface TestSubscription {
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

class MonthlyRenewalTester {
  private processor: AutomaticRenewalProcessor;

  constructor() {
    this.processor = new AutomaticRenewalProcessor();
  }

  async runMonthlyRenewalTest(): Promise<void> {
    try {
      console.log('🧪 [TEST] Starting monthly renewal test...');
      console.log('⏰ [TEST] Test started at:', new Date().toISOString());

      // Step 1: Create test subscription that expires in 1 month
      const testSubscription = await this.createTestSubscription();
      console.log('✅ [TEST] Test subscription created:', testSubscription.id);

      // Step 2: Simulate time passage (modify next_payment_date to now)
      await this.simulateMonthPassage(testSubscription.id);
      console.log('⏩ [TEST] Simulated 1 month passage');

      // Step 3: Run the renewal process
      console.log('🔄 [TEST] Running automatic renewal process...');
      await this.processor.processDueRenewals();

      // Step 4: Verify renewal results
      await this.verifyRenewalResults(testSubscription.id);

      console.log('🎉 [TEST] Monthly renewal test completed successfully');
    } catch (error) {
      console.error('💥 [TEST] Monthly renewal test failed:', error);
      throw error;
    }
  }

  private async createTestSubscription(): Promise<TestSubscription> {
    try {
      console.log('📝 [TEST] Creating test subscription...');

      // Get a test package (try different names)
      let packageData = null;
      let packageError = null;
      
      const packageNames = ['Pro', 'Basic', 'Premium', 'Standard'];
      for (const name of packageNames) {
        const result = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', name)
          .single();
        
        if (!result.error && result.data) {
          packageData = result.data;
          console.log(`✅ [TEST] Found package: ${name}`);
          break;
        }
        packageError = result.error;
      }
      
      // If no package found, create a test one
      if (!packageData) {
        console.log('📝 [TEST] No existing package found, creating test package...');
        const { data: newPackage, error: createError } = await supabase
          .from('subscription_plans')
          .insert({
            name: 'Test Pro',
            price: 99.00,
            currency: 'UAH',
            description: 'Test package for monthly renewal testing',
            features: ['Feature 1', 'Feature 2', 'Feature 3'],
            is_active: true,
            billing_period: 'month'
          })
          .select()
          .single();
        
        if (createError || !newPackage) {
          console.error('❌ [TEST] Error creating test package:', createError);
          throw new Error('Could not create test package');
        }
        
        packageData = newPackage;
        console.log('✅ [TEST] Test package created successfully');
      }

      // Get or create a test user
      let userData = null;
      const { data: existingUser, error: userError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('email', 'test@example.com')
        .single();

      if (userError || !existingUser) {
        console.log('📝 [TEST] Test user not found, creating one...');
        const { data: newUser, error: createError } = await supabase
          .from('custom_users')
          .insert({
            email: 'test@example.com',
            nickname: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            subscription_status: 'inactive',
            subscription_plan: null,
            subscription_expires_at: null
          })
          .select()
          .single();
        
        if (createError || !newUser) {
          console.error('❌ [TEST] Error creating test user:', createError);
          throw new Error('Could not create test user');
        }
        
        userData = newUser;
        console.log(' [TEST] Test user created successfully');
      } else {
        userData = existingUser;
        console.log(' [TEST] Found existing test user');
      }

      console.log(' [TEST] Package data:', packageData);
      console.log(' [TEST] Package price:', packageData.price);

      // Create test subscription that expires in 1 month
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

      const testSubscription: Partial<TestSubscription> = {
        user_id: userData.id,
        package_id: packageData.id,
        subscription_id: `test_sub_${Date.now()}`,
        payment_id: `test_pay_${Date.now()}`,
        rec_token: 'test_token_' + Math.random().toString(36).substr(2, 20),
        status: 'active',
        billing_period: 'month',
        amount: packageData.price || 99.00, // Default fallback price
        currency: packageData.currency || 'UAH',
        last_payment_date: new Date().toISOString(),
        next_payment_date: nextPaymentDate.toISOString(),
        failed_attempts: 0,
        is_active: true
      };

      const { data: subscriptionData, error: insertError } = await supabase
        .from('recurring_subscriptions')
        .insert(testSubscription)
        .select()
        .single();

      if (insertError || !subscriptionData) {
        console.error('❌ [TEST] Error creating test subscription:', insertError);
        throw insertError || new Error('Failed to create test subscription');
      }

      console.log('✅ [TEST] Test subscription created successfully');
      console.log('📊 [TEST] Subscription details:', {
        id: subscriptionData.id,
        user_id: subscriptionData.user_id,
        package_id: subscriptionData.package_id,
        next_payment_date: subscriptionData.next_payment_date,
        amount: subscriptionData.amount
      });

      return subscriptionData as TestSubscription;
    } catch (error) {
      console.error('💥 [TEST] Error creating test subscription:', error);
      throw error;
    }
  }

  private async simulateMonthPassage(subscriptionId: string): Promise<void> {
    try {
      console.log('⏩ [TEST] Simulating 1 month passage...');

      // Update next_payment_date to now to simulate expiration
      const { error: updateError } = await supabase
        .from('recurring_subscriptions')
        .update({
          next_payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (updateError) {
        console.error('❌ [TEST] Error simulating month passage:', updateError);
        throw updateError;
      }

      console.log('✅ [TEST] Month passage simulated successfully');
    } catch (error) {
      console.error('💥 [TEST] Error simulating month passage:', error);
      throw error;
    }
  }

  private async verifyRenewalResults(subscriptionId: string): Promise<void> {
    try {
      console.log('🔍 [TEST] Verifying renewal results...');

      // Check if subscription was renewed
      const { data: renewedSubscription, error: fetchError } = await supabase
        .from('recurring_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (fetchError) {
        console.error('❌ [TEST] Error fetching renewed subscription:', fetchError);
        throw fetchError;
      }

      console.log('📊 [TEST] Renewed subscription details:', {
        id: renewedSubscription.id,
        last_payment_date: renewedSubscription.last_payment_date,
        next_payment_date: renewedSubscription.next_payment_date,
        failed_attempts: renewedSubscription.failed_attempts,
        status: renewedSubscription.status,
        is_active: renewedSubscription.is_active
      });

      // Check if user subscription was extended
      const { data: userSubscription, error: userSubError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', renewedSubscription.user_id)
        .eq('package_id', renewedSubscription.package_id)
        .eq('status', 'active')
        .single();

      if (userSubError) {
        console.error('❌ [TEST] Error fetching user subscription:', userSubError);
        throw userSubError;
      }

      console.log('📊 [TEST] User subscription details:', {
        id: userSubscription.id,
        end_date: userSubscription.end_date,
        status: userSubscription.status
      });

      // Check if user profile was updated
      const { data: userProfile, error: profileError } = await supabase
        .from('custom_users')
        .select('subscription_status, subscription_plan, subscription_expires_at')
        .eq('id', renewedSubscription.user_id)
        .single();

      if (profileError) {
        console.error('❌ [TEST] Error fetching user profile:', profileError);
        throw profileError;
      }

      console.log('📊 [TEST] User profile details:', userProfile);

      // Verify the renewal was successful
      const now = new Date();
      const nextPaymentDate = new Date(renewedSubscription.next_payment_date);
      const expectedNextPayment = new Date();
      expectedNextPayment.setMonth(expectedNextPayment.getMonth() + 1);

      const isRenewalSuccessful = 
        renewedSubscription.failed_attempts === 0 &&
        renewedSubscription.status === 'active' &&
        renewedSubscription.is_active === true &&
        nextPaymentDate > now &&
        userSubscription.end_date > now.toISOString() &&
        userProfile.subscription_status === 'active';

      if (isRenewalSuccessful) {
        console.log('✅ [TEST] Renewal verification PASSED');
        console.log('🎉 [TEST] Subscription was successfully renewed for another month');
      } else {
        console.log('❌ [TEST] Renewal verification FAILED');
        console.log('📊 [TEST] Verification checks:', {
          failedAttemptsZero: renewedSubscription.failed_attempts === 0,
          statusActive: renewedSubscription.status === 'active',
          isActiveTrue: renewedSubscription.is_active === true,
          nextPaymentInFuture: nextPaymentDate > now,
          userSubExtended: userSubscription.end_date > now.toISOString(),
          profileStatusActive: userProfile.subscription_status === 'active'
        });
        throw new Error('Renewal verification failed');
      }

    } catch (error) {
      console.error('💥 [TEST] Error verifying renewal results:', error);
      throw error;
    }
  }

  async cleanupTestData(): Promise<void> {
    try {
      console.log('🧹 [TEST] Cleaning up test data...');

      // Remove test subscriptions
      const { error: deleteError } = await supabase
        .from('recurring_subscriptions')
        .delete()
        .like('subscription_id', 'test_sub_%');

      if (deleteError) {
        console.error('❌ [TEST] Error cleaning up test subscriptions:', deleteError);
      } else {
        console.log('✅ [TEST] Test subscriptions cleaned up');
      }

    } catch (error) {
      console.error('💥 [TEST] Error during cleanup:', error);
    }
  }
}

// Run the test if this script is executed directly
async function main(): Promise<void> {
  try {
    const tester = new MonthlyRenewalTester();
    
    // Cleanup any existing test data
    await tester.cleanupTestData();
    
    // Run the test
    await tester.runMonthlyRenewalTest();
    
    // Cleanup after test
    await tester.cleanupTestData();
    
    console.log('✅ [TEST] Monthly renewal test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 [TEST] Monthly renewal test failed:', error);
    
    // Try to cleanup even on failure
    try {
      const tester = new MonthlyRenewalTester();
      await tester.cleanupTestData();
    } catch (cleanupError) {
      console.error('💥 [TEST] Cleanup also failed:', cleanupError);
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MonthlyRenewalTester };
