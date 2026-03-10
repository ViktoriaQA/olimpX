import { Router } from 'express';
import { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

interface IframeLogRequest {
  event: 'iframe_loaded' | 'iframe_error' | 'tab_clicked';
  url: string;
  userAgent: string;
  isMobile: boolean;
  timestamp?: string;
  taskId?: string;
  tournamentId?: string;
  error?: string;
}

interface DailySummary {
  [key: string]: any;
  mobile: {
    loaded: number;
    error: number;
    clicked: number;
  };
  desktop: {
    loaded: number;
    error: number;
    clicked: number;
  };
  lastUpdate?: string;
}

const router = Router();

// Log iframe events to file and console
router.post('/iframe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { event, url, userAgent, isMobile, timestamp, taskId, tournamentId, error } = req.body as IframeLogRequest;
    
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      event,
      url,
      userAgent,
      isMobile,
      taskId,
      tournamentId,
      error,
      ip: req.ip,
      userId: (req as any).user?.id
    };

    // Console logging with emojis for better visibility
    const consoleMessage: { [key: string]: string } = {
      'iframe_loaded': '✅ OneCompiler iframe loaded successfully',
      'iframe_error': '❌ OneCompiler iframe failed to load',
      'tab_clicked': '🖱️ OneCompiler tab clicked'
    };
    
    console.log(consoleMessage[event] || `📝 OneCompiler event: ${event}`);
    console.log('📊 Iframe Log Data:', JSON.stringify(logEntry, null, 2));

    // Save to log file
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'iframe.log');
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFileSync(logFile, logLine);

    // Also save daily summary
    const today = new Date().toISOString().split('T')[0];
    const summaryFile = path.join(logDir, `iframe-summary-${today}.json`);
    
    let summary: DailySummary = {
      mobile: { loaded: 0, error: 0, clicked: 0 },
      desktop: { loaded: 0, error: 0, clicked: 0 }
    };
    
    if (fs.existsSync(summaryFile)) {
      summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
    }

    // Update summary
    if (!summary[event]) summary[event] = 0;
    summary[event]++;

    if (!summary.mobile) summary.mobile = { loaded: 0, error: 0, clicked: 0 };
    if (!summary.desktop) summary.desktop = { loaded: 0, error: 0, clicked: 0 };

    const eventType = event.replace('iframe_', '') as 'loaded' | 'error' | 'clicked';
    
    if (isMobile) {
      summary.mobile[eventType]++;
    } else {
      summary.desktop[eventType]++;
    }

    summary.lastUpdate = new Date().toISOString();

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    res.json({ success: true, logged: true });

  } catch (error) {
    console.error('❌ Error logging iframe event:', error);
    res.status(500).json({ error: 'Failed to log iframe event' });
  }
});

// Get iframe logs summary
router.get('/iframe/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const summaryFile = path.join(process.cwd(), 'logs', `iframe-summary-${today}.json`);
    
    if (fs.existsSync(summaryFile)) {
      const summary: DailySummary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
      res.json(summary);
    } else {
      res.json({ message: 'No logs found for today' });
    }
  } catch (error) {
    console.error('❌ Error getting iframe summary:', error);
    res.status(500).json({ error: 'Failed to get iframe summary' });
  }
});

export default router;
