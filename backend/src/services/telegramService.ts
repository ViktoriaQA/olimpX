interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

export class TelegramService {
  private botToken: string;
  private chatId: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    
    if (!this.botToken || !this.chatId) {
      console.log('📱 Telegram service disabled - missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    } else {
      console.log('📱 Telegram service initialized');
    }
  }

  async sendMessage(message: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      console.log('Telegram not configured, skipping message');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const payload: TelegramMessage = {
        chat_id: this.chatId,
        text: message,
        parse_mode: parseMode
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram API error:', error);
        return false;
      }

      const result = await response.json() as any;
      console.log('Telegram message sent successfully:', result.message_id);
      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  async sendPaymentNotification(userEmail: string, packageName: string, amount: number, currency: string): Promise<boolean> {
    const message = `
🎉 <b>Нова оплата підписки!</b>

👤 <b>Користувач:</b> ${userEmail}
📦 <b>Пакет:</b> ${packageName}
💰 <b>Сума:</b> ${amount} ${currency}
⏰ <b>Час:</b> ${new Date().toLocaleString('uk-UA')}

✅ Платіж успішно оброблено!
    `.trim();

    return this.sendMessage(message);
  }

  async sendSubscriptionCancellationNotification(userEmail: string, packageName: string): Promise<boolean> {
    const message = `
🚫 <b>Скасування підписки</b>

👤 <b>Користувач:</b> ${userEmail}
📦 <b>Пакет:</b> ${packageName}
⏰ <b>Час:</b> ${new Date().toLocaleString('uk-UA')}

❌ Підписку скасовано
    `.trim();

    return this.sendMessage(message);
  }

  async sendErrorNotification(error: string, context?: string): Promise<boolean> {
    const message = `
🚨 <b>Помилка в системі</b>

${context ? `<b>Контекст:</b> ${context}\n` : ''}<b>Помилка:</b> ${error}
⏰ <b>Час:</b> ${new Date().toLocaleString('uk-UA')}
    `.trim();

    return this.sendMessage(message);
  }
}

export default TelegramService;
