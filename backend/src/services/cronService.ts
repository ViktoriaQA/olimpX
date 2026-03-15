import * as cron from 'node-cron';
import { supabase } from '../utils/supabase';

class CronService {
  private tasks: Map<string, any> = new Map();

  constructor() {
    this.initializeTasks();
  }

  private initializeTasks() {
    // Clean expired sessions on the 1st of every month at 2:00 AM
    const monthlyCleanup = cron.schedule('0 2 1 * *', async () => {
      console.log('🧹 Starting monthly session cleanup...');
      await this.cleanupExpiredSessions(30); // Default to 30 days
    }, {
      timezone: 'Europe/Kiev'
    });

    this.tasks.set('monthly-cleanup', monthlyCleanup);

    // Start all tasks
    this.startAllTasks();
  }

  private async cleanupExpiredSessions(days: number = 30) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      
      console.log(`🗓️  Cleaning sessions older than ${cutoffDate} or expired before ${now}`);
      
      let totalDeleted = 0;
      
      // Step 1: Delete old sessions
      const { data: oldDeleted, error: oldError } = await supabase
        .from('user_sessions')
        .delete()
        .lt('created_at', cutoffDate)
        .select('id');
      
      if (oldError) {
        console.error('❌ Error deleting old sessions:', oldError);
      } else {
        totalDeleted += (oldDeleted?.length || 0);
        console.log(`✅ Deleted ${oldDeleted?.length || 0} old sessions`);
      }
      
      // Step 2: Delete expired sessions
      const { data: expiredDeleted, error: expiredError } = await supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', now)
        .select('id');
      
      if (expiredError) {
        console.error('❌ Error deleting expired sessions:', expiredError);
      } else {
        totalDeleted += (expiredDeleted?.length || 0);
        console.log(`✅ Deleted ${expiredDeleted?.length || 0} expired sessions`);
      }
      
      console.log(`🎉 Monthly cleanup completed. Total deleted: ${totalDeleted} sessions`);
      
      // Log cleanup to database for audit
      await this.logCleanupToDatabase(totalDeleted, days);
      
    } catch (error) {
      console.error('❌ Error during monthly session cleanup:', error);
    }
  }

  private async logCleanupToDatabase(deletedCount: number, daysThreshold: number) {
    try {
      const { error } = await supabase
        .from('system_logs')
        .insert({
          action: 'session_cleanup',
          details: {
            deleted_sessions: deletedCount,
            days_threshold: daysThreshold,
            cleanup_date: new Date().toISOString(),
            automatic: true
          },
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('❌ Error logging cleanup to database:', error);
      } else {
        console.log('📝 Cleanup logged to database');
      }
    } catch (error) {
      console.error('❌ Error in logCleanupToDatabase:', error);
    }
  }

  public startAllTasks() {
    this.tasks.forEach((task: any, name) => {
      task.start();
      console.log(`⏰ Started cron job: ${name}`);
    });
  }

  public stopAllTasks() {
    this.tasks.forEach((task: any, name) => {
      task.stop();
      console.log(`⏹️  Stopped cron job: ${name}`);
    });
  }

  public runCleanupNow(days: number = 30) {
    console.log(`🚀 Running manual cleanup for ${days} days...`);
    return this.cleanupExpiredSessions(days);
  }

  public getTaskStatus() {
    const status: Record<string, boolean> = {};
    this.tasks.forEach((task: any, name) => {
      status[name] = task.running || false;
    });
    return status;
  }
}

export const cronService = new CronService();
