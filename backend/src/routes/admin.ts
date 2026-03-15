import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest, requireRole } from '../middleware/auth';
import { cronService } from '../services/cronService';

const router = Router();

// Get session statistics
router.get('/stats', requireRole(['admin']), async (req, res) => {
  try {
    console.log('Admin stats request - User:', (req as any).user);
    
    // Get total sessions count
    const { count: totalCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true });
    
    // Get active sessions (updated in last 24 hours)
    const { count: activeCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    // Get expired sessions (older than 30 days OR expired)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Stats: 30 days cutoff = ${thirtyDaysAgo}`);
    
    const { count: expiredCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .or(`created_at.lt.${thirtyDaysAgo},expires_at.lt.${new Date().toISOString()}`);
    
    console.log(`Stats: Found ${expiredCount} sessions older than 30 days or expired`);
    
    // Get oldest and newest session dates
    const { data: dateRangeData } = await supabase
      .from('user_sessions')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1);
    
    const { data: newestData } = await supabase
      .from('user_sessions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    
    const stats = {
      total_sessions: totalCount || 0,
      active_sessions: activeCount || 0,
      expired_sessions: expiredCount || 0,
      oldest_session_date: dateRangeData?.[0]?.created_at || null,
      newest_session_date: newestData?.[0]?.created_at || null
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching session stats:', error);
    res.status(500).json({ error: 'Failed to fetch session statistics' });
  }
});

// Get sessions count for specific threshold
router.get('/sessions-count', requireRole(['admin']), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days threshold must be between 1 and 365' });
    }
    
    // Count sessions older than the specified threshold
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    
    console.log(`Sessions count for ${days} days: cutoff date = ${cutoffDate}`);
    
    // Use the same logic as deletion - count in two steps
    let totalCount = 0;
    
    // Step 1: Count old sessions
    const { count: oldCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate);
    
    // Step 2: Count expired sessions
    const { count: expiredCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', now);
    
    // Note: This might double-count sessions that are both old AND expired
    // For simplicity, we'll use the max of the two counts
    totalCount = Math.max(oldCount || 0, expiredCount || 0);
    
    console.log(`Found ${oldCount || 0} old sessions and ${expiredCount || 0} expired sessions`);
    console.log(`Using count: ${totalCount} sessions older than ${days} days`);
    
    res.json({
      deletable_sessions: totalCount,
      days_threshold: days,
      cutoff_date: cutoffDate
    });
  } catch (error) {
    console.error('Error fetching sessions count:', error);
    res.status(500).json({ error: 'Failed to fetch sessions count' });
  }
});

// Clean expired sessions
router.delete('/clean', requireRole(['admin']), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days threshold must be between 1 and 365' });
    }
    
    // Delete sessions older than the specified threshold
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    
    console.log(`Clean: deleting sessions older than ${cutoffDate} or expired before ${now}`);
    
    // Use a simpler approach - delete in two steps
    let totalDeleted = 0;
    
    // Step 1: Delete old sessions
    const { data: oldDeleted, error: oldError } = await supabase
      .from('user_sessions')
      .delete()
      .lt('created_at', cutoffDate)
      .select('id');
    
    if (oldError) {
      console.error('Error deleting old sessions:', oldError);
      throw oldError;
    }
    
    totalDeleted += (oldDeleted?.length || 0);
    console.log(`Deleted ${oldDeleted?.length || 0} old sessions`);
    
    // Step 2: Delete expired sessions
    const { data: expiredDeleted, error: expiredError } = await supabase
      .from('user_sessions')
      .delete()
      .lt('expires_at', now)
      .select('id');
    
    if (expiredError) {
      console.error('Error deleting expired sessions:', expiredError);
      throw expiredError;
    }
    
    totalDeleted += (expiredDeleted?.length || 0);
    console.log(`Deleted ${expiredDeleted?.length || 0} expired sessions`);
    
    console.log(`Successfully deleted total of ${totalDeleted} sessions`);
    
    res.json({
      deleted_sessions: totalDeleted,
      message: `Successfully deleted ${totalDeleted} expired sessions`
    });
  } catch (error) {
    console.error('Error cleaning sessions:', error);
    res.status(500).json({ error: 'Failed to clean expired sessions' });
  }
});

// Cron job management endpoints
router.get('/cron/status', requireRole(['admin']), (req, res) => {
  try {
    const status = cronService.getTaskStatus();
    res.json({
      status: 'ok',
      tasks: status,
      next_run: {
        monthly_cleanup: '1st of each month at 2:00 AM (Europe/Kiev)'
      }
    });
  } catch (error) {
    console.error('Error getting cron status:', error);
    res.status(500).json({ error: 'Failed to get cron status' });
  }
});

router.post('/cron/cleanup-now', requireRole(['admin']), async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days threshold must be between 1 and 365' });
    }
    
    // Run cleanup asynchronously
    cronService.runCleanupNow(days);
    
    res.json({
      message: `Manual cleanup started for ${days} days`,
      days_threshold: days
    });
  } catch (error) {
    console.error('Error starting manual cleanup:', error);
    res.status(500).json({ error: 'Failed to start manual cleanup' });
  }
});

router.get('/cron/logs', requireRole(['admin']), async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('system_logs')
      .select('*')
      .eq('action', 'session_cleanup')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      throw error;
    }
    
    res.json({
      logs: logs || [],
      total: logs?.length || 0
    });
  } catch (error) {
    console.error('Error fetching cron logs:', error);
    res.status(500).json({ error: 'Failed to fetch cron logs' });
  }
});

export default router;
