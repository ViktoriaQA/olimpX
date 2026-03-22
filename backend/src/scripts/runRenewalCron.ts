import dotenv from 'dotenv';
import path from 'path';
import { AutomaticRenewalProcessor } from './processAutomaticRenewals';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runRenewalCron(): Promise<void> {
  try {
    console.log('🕐 [CRON] Starting automatic renewal cron job...');
    console.log('⏰ [CRON] Cron job started at:', new Date().toISOString());

    const processor = new AutomaticRenewalProcessor();
    await processor.processDueRenewals();

    console.log('✅ [CRON] Cron job completed successfully at:', new Date().toISOString());
  } catch (error) {
    console.error('💥 [CRON] Cron job failed:', error);
    console.error('💥 [CRON] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
}

// Run the cron job if this script is executed directly
if (require.main === module) {
  runRenewalCron()
    .then(() => {
      console.log('✅ [CRON] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 [CRON] Script failed:', error);
      process.exit(1);
    });
}

export { runRenewalCron };
