import { supabase } from '../utils/supabase';

interface CleanupResult {
  deletedSubscriptions: number;
  deletedPaymentAttempts: number;
  deletedRecurringSubscriptions: number;
  updatedProfiles: number;
  errors: string[];
}

async function cleanupTestSubscriptions(userId?: string, keepLatestActive: boolean = false): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedSubscriptions: 0,
    deletedPaymentAttempts: 0,
    deletedRecurringSubscriptions: 0,
    updatedProfiles: 0,
    errors: []
  };

  try {
    console.log('🧹 Starting cleanup of test subscriptions...');
    console.log(keepLatestActive ? '🔄 Keeping latest active subscription' : '🗑️  Deleting all subscriptions');
    
    // If userId provided, only clean that user's data
    const userFilter = userId ? { user_id: userId } : {};

    // 1. Handle user subscriptions
    console.log('🗑️  Processing user subscriptions...');
    
    let subscriptionIdsToKeep: string[] = [];
    
    if (keepLatestActive) {
      // Find the latest active subscription to keep
      const { data: latestActive, error: latestError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .match(userFilter)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!latestError && latestActive) {
        subscriptionIdsToKeep = [latestActive.id];
        console.log(`🔄 Keeping latest active subscription: ${latestActive.id}`);
      } else if (latestError && latestError.code !== 'PGRST116') {
        result.errors.push(`Failed to find latest active subscription: ${latestError.message}`);
      }
    }

    // Delete subscriptions except those to keep
    let deleteQuery = supabase
      .from('user_subscriptions')
      .delete()
      .match(userFilter);
    
    if (subscriptionIdsToKeep.length > 0) {
      deleteQuery = deleteQuery.not('id', 'in', `(${subscriptionIdsToKeep.join(',')})`);
    }

    const { data: deletedSubs, error: subsError } = await deleteQuery.select('id');

    if (subsError) {
      result.errors.push(`Failed to delete subscriptions: ${subsError.message}`);
    } else {
      result.deletedSubscriptions = deletedSubs?.length || 0;
      console.log(`✅ Deleted ${result.deletedSubscriptions} subscriptions`);
    }

    // 2. Delete payment attempts (except for subscriptions we're keeping)
    console.log('🗑️  Deleting payment attempts...');
    
    let paymentDeleteQuery = supabase
      .from('payment_attempts')
      .delete()
      .match(userFilter);
    
    if (subscriptionIdsToKeep.length > 0) {
      // For payment attempts, we need to check against subscription_id if it exists
      // This is more complex, so for now we'll delete all payment attempts
      console.log('⚠️  Deleting all payment attempts (subscription filtering not supported)');
    }

    const { data: deletedPayments, error: paymentsError } = await paymentDeleteQuery.select('id');

    if (paymentsError) {
      result.errors.push(`Failed to delete payment attempts: ${paymentsError.message}`);
    } else {
      result.deletedPaymentAttempts = deletedPayments?.length || 0;
      console.log(`✅ Deleted ${result.deletedPaymentAttempts} payment attempts`);
    }

    // 3. Delete recurring subscriptions (except for subscriptions we're keeping)
    console.log('🗑️  Deleting recurring subscriptions...');
    
    let recurringDeleteQuery = supabase
      .from('recurring_subscriptions')
      .delete()
      .match(userFilter);
    
    if (subscriptionIdsToKeep.length > 0) {
      recurringDeleteQuery = recurringDeleteQuery.not('subscription_id', 'in', `(${subscriptionIdsToKeep.join(',')})`);
    }

    const { data: deletedRecurring, error: recurringError } = await recurringDeleteQuery.select('id');

    if (recurringError) {
      result.errors.push(`Failed to delete recurring subscriptions: ${recurringError.message}`);
    } else {
      result.deletedRecurringSubscriptions = deletedRecurring?.length || 0;
      console.log(`✅ Deleted ${result.deletedRecurringSubscriptions} recurring subscriptions`);
    }

    // 4. Reset user profiles (only if no active subscriptions left)
    console.log('🔄 Checking user profiles...');
    
    let profileUpdateQuery = supabase
      .from('custom_users')
      .update({
        subscription_status: null,
        subscription_plan: null,
        subscription_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .match(userFilter);

    if (subscriptionIdsToKeep.length > 0) {
      // Don't reset profiles if we're keeping subscriptions
      console.log('🔄 Skipping profile reset (keeping active subscriptions)');
      result.updatedProfiles = 0;
    } else {
      const { data: updatedProfiles, error: profilesError } = await profileUpdateQuery.select('id');

      if (profilesError) {
        result.errors.push(`Failed to reset profiles: ${profilesError.message}`);
      } else {
        result.updatedProfiles = updatedProfiles?.length || 0;
        console.log(`✅ Reset ${result.updatedProfiles} user profiles`);
      }
    }

    console.log('🎉 Cleanup completed!');
    return result;

  } catch (error) {
    console.error('💥 Unexpected error during cleanup:', error);
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const userId = args[0]; // Optional: pass user ID as first argument
  const keepLatest = args.includes('--keep-latest') || args.includes('-k');
  
  console.log(userId ? `👤 Cleaning subscriptions for user: ${userId}` : '🧹 Cleaning ALL test subscriptions');
  console.log(keepLatest ? '🔄 Keeping latest active subscription' : '🗑️  Deleting all subscriptions');
  
  const confirmation = args.includes('--confirm') || 
                      args.includes('-c') || 
                      process.env.NODE_ENV === 'development';
  
  if (!confirmation) {
    console.log('⚠️  This will permanently delete subscription data!');
    console.log('To confirm, run with --confirm flag or in development environment');
    console.log('Example: npm run cleanup:subscriptions -- --confirm');
    console.log('Example: npm run cleanup:subscriptions -- USER_ID --confirm');
    console.log('Example: npm run cleanup:subscriptions -- --keep-latest --confirm');
    console.log('Example: npm run cleanup:subscriptions -- USER_ID --keep-latest --confirm');
    process.exit(1);
  }

  const result = await cleanupTestSubscriptions(userId, keepLatest);
  
  console.log('\n📊 Cleanup Results:');
  console.log(`- Deleted subscriptions: ${result.deletedSubscriptions}`);
  console.log(`- Deleted payment attempts: ${result.deletedPaymentAttempts}`);
  console.log(`- Deleted recurring subscriptions: ${result.deletedRecurringSubscriptions}`);
  console.log(`- Updated user profiles: ${result.updatedProfiles}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`- ${error}`));
    process.exit(1);
  }
  
  console.log('\n✅ Cleanup completed successfully!');
}

// Export for use in other modules
export { cleanupTestSubscriptions };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
