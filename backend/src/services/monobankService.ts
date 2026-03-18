import crypto from 'crypto';
import { PaymentRequest, PaymentResponse } from '../models/subscription';

export interface MonobankInvoiceRequest {
  amount: number; // в копійках
  ccy: number; // 980 - UAH
  merchantPaymInfo: {
    reference: string; // order_id
    destination: string; // опис платежу
    comment?: string;
    customerEmails?: string[];
    customerPhones?: string[];
  };
  redirectUrl: string; // URL для повернення після оплати
  webHookUrl: string; // URL для callback
  validity?: number; // TTL в секундах
  paymentMethod?: 'card' | 'googlepay' | 'applepay';
  saveCardData?: {
    saveCard: boolean;
    walletId: string; // ідентифікатор гаманця користувача
  };
}

export interface MonobankInvoiceResponse {
  invoiceId: string;
  pageUrl: string; // URL для оплати
  cancelUrl?: string;
  qrCode?: string;
  creationDate?: number; // може бути відсутнім
  expirationDate?: number;
  status?: 'created' | 'processing' | 'success' | 'failure' | 'expired' | 'reversed';
  amount?: number;
  ccy?: number;
  finalAmount?: number;
  commission?: {
    commissionFee?: number;
    commissionType?: string;
  };
  paymentMethod?: string;
  paymentInfo?: {
    ip?: string;
    cardMask?: string;
    cardType?: string;
    cardBank?: string;
    cardCountry?: string;
    cardProduct?: string;
    token?: string;
  };
  refund?: {
    amount: number;
    date: number;
    comment?: string;
  };
  merchantPaymInfo?: {
    reference: string;
    destination: string;
    comment?: string;
  };
  customFields?: Record<string, any>;
  timestamp?: number;
  signature?: string;
}

export interface MonobankCallbackData {
  invoiceId: string;
  status: 'processing' | 'success' | 'failure' | 'expired' | 'reversed';
  amount: number;
  ccy: number;
  finalAmount?: number;
  commission?: {
    commissionFee?: number;
    commissionType?: string;
  };
  paymentMethod?: string;
  paymentInfo?: {
    ip?: string;
    cardMask?: string;
    cardType?: string;
    cardBank?: string;
    cardCountry?: string;
    cardProduct?: string;
    token?: string;
  };
  refund?: {
    amount: number;
    date: number;
    comment?: string;
  };
  merchantPaymInfo: {
    reference: string;
    destination: string;
    comment?: string;
  };
  customFields?: Record<string, any>;
  timestamp: number;
  signature: string; // ECDSA підпис
}

export class MonobankService {
  private token: string;
  private callbackUrl: string;
  private resultUrl: string;
  private baseUrl: string;
  private webhookSecret: string;

  constructor() {
    this.token = process.env.MONOBANK_TOKEN || '';
    this.callbackUrl = process.env.MONOBANK_CALLBACK_URL || '';
    this.resultUrl = process.env.MONOBANK_RESULT_URL || '';
    this.webhookSecret = process.env.MONOBANK_WEBHOOK_SECRET || '';
    
    // Вибір URL залежно від середовища
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.monobank.ua' 
      : 'https://api.monobank.ua'; // Monobank не має тестового середовища

    console.log('Monobank Service initialized');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Callback URL:', this.callbackUrl);
    console.log('Result URL:', this.resultUrl);
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Token': this.token,
    };
  }

  async createInvoice(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('🚀 [MONOBANK] Creating invoice...', request);

      // Конвертація суми з гривень в копійки
      const amountInKopiyky = Math.round(request.amount * 100);

      const invoiceRequest: MonobankInvoiceRequest = {
        amount: amountInKopiyky,
        ccy: 980, // UAH
        merchantPaymInfo: {
          reference: request.order_id,
          destination: request.description.substring(0, 255), // обмеження 255 символів
          comment: `Пакет: ${request.product_name || 'Підписка'}`,
          customerEmails: request.email ? [request.email] : undefined,
          customerPhones: request.phone ? [request.phone] : undefined,
        },
        redirectUrl: `${this.resultUrl}?order_id=${request.order_id}&payment_id=${request.order_id}`,
        webHookUrl: this.callbackUrl,
        validity: 3600, // 1 година
        paymentMethod: 'card',
        saveCardData: request.order_type === 'recurring' ? {
          saveCard: true,
          walletId: request.customer || `user_${request.order_id.split('_')[1]}` // використовуємо user_id як walletId
        } : undefined,
      };

      console.log('📝 [MONOBANK] Invoice request:', invoiceRequest);

      const response = await fetch(`${this.baseUrl}/api/merchant/invoice/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(invoiceRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MONOBANK] API Error:', response.status, errorText);
        throw new Error(`Monobank API error: ${response.status} ${errorText}`);
      }

      const invoiceData: MonobankInvoiceResponse = await response.json() as MonobankInvoiceResponse;
      console.log('✅ [MONOBANK] Invoice created:', invoiceData);
      console.log('🔍 [MONOBANK] Response details:', {
        invoiceId: invoiceData.invoiceId,
        pageUrl: invoiceData.pageUrl,
        status: invoiceData.status,
        creationDate: invoiceData.creationDate,
        amount: invoiceData.amount
      });

      return {
        checkout_url: invoiceData.pageUrl,
        checkout_form: this.generateCheckoutForm(invoiceData.pageUrl),
        data: JSON.stringify(invoiceData),
        signature: '', // Monobank використовує ECDSA для callbacks
        payment_id: invoiceData.invoiceId,
        order_id: request.order_id,
        status: this.mapMonobankStatus(invoiceData.status || 'created'),
        amount: request.amount,
        currency: request.currency || 'UAH',
        description: request.description,
        result_url: request.result_url || this.resultUrl,
        server_url: request.server_url || this.callbackUrl,
        language: request.language || 'uk',
        order_type: request.order_type || 'recurring',
        create_date: invoiceData.creationDate 
          ? new Date(invoiceData.creationDate * 1000).toISOString()
          : new Date().toISOString(), // fallback до поточної дати
        public_key: this.token.substring(0, 10) + '...', // частково приховати токен
      };
    } catch (error) {
      console.error('💥 [MONOBANK] Error creating invoice:', error);
      throw error;
    }
  }

  async getInvoiceStatus(invoiceId: string): Promise<MonobankInvoiceResponse> {
    try {
      console.log('🔍 [MONOBANK] Getting invoice status:', invoiceId);

      const response = await fetch(`${this.baseUrl}/api/merchant/invoice/status?invoiceId=${invoiceId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MONOBANK] Status check error:', response.status, errorText);
        throw new Error(`Monobank API error: ${response.status} ${errorText}`);
      }

      const statusData: MonobankInvoiceResponse = await response.json() as MonobankInvoiceResponse;
      console.log('✅ [MONOBANK] Invoice status:', statusData);

      return statusData;
    } catch (error) {
      console.error('💥 [MONOBANK] Error getting invoice status:', error);
      throw error;
    }
  }

  async cancelInvoice(invoiceId: string, amount?: number): Promise<any> {
    try {
      console.log('🚫 [MONOBANK] Cancelling invoice:', invoiceId);

      const requestBody: any = {
        invoiceId,
      };

      if (amount) {
        requestBody.amount = Math.round(amount * 100); // в копійках
      }

      const response = await fetch(`${this.baseUrl}/api/merchant/invoice/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MONOBANK] Cancel error:', response.status, errorText);
        throw new Error(`Monobank API error: ${response.status} ${errorText}`);
      }

      const result = await response.json() as any;
      console.log('✅ [MONOBANK] Invoice cancelled:', result);

      return result;
    } catch (error) {
      console.error('💥 [MONOBANK] Error cancelling invoice:', error);
      throw error;
    }
  }

  async getReceipt(invoiceId: string): Promise<Buffer> {
    try {
      console.log('🧾 [MONOBANK] Getting receipt:', invoiceId);

      const response = await fetch(`${this.baseUrl}/api/merchant/invoice/receipt?invoiceId=${invoiceId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MONOBANK] Receipt error:', response.status, errorText);
        throw new Error(`Monobank API error: ${response.status} ${errorText}`);
      }

      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      console.log('✅ [MONOBANK] Receipt received, size:', pdfBuffer.length);

      return pdfBuffer;
    } catch (error) {
      console.error('💥 [MONOBANK] Error getting receipt:', error);
      throw error;
    }
  }

  verifyWebhookSignature(data: string, signature: string): boolean {
    try {
      console.log('🔐 [MONOBANK] Verifying webhook signature...');

      if (!this.webhookSecret) {
        console.warn('⚠️ [MONOBANK] Webhook secret not configured, skipping verification');
        return true; // для розробки
      }

      // Перевірка ECDSA підпису
      const publicKey = crypto.createPublicKey(this.webhookSecret);
      const isVerified = crypto.verify(
        'sha256',
        Buffer.from(data),
        {
          key: publicKey,
          format: 'pem',
          type: 'spki',
        },
        Buffer.from(signature, 'base64')
      );

      console.log(isVerified ? '✅ [MONOBANK] Signature verified' : '❌ [MONOBANK] Invalid signature');
      return isVerified;
    } catch (error) {
      console.error('💥 [MONOBANK] Error verifying signature:', error);
      return false;
    }
  }

  parseWebhookData(body: any): MonobankCallbackData {
    try {
      console.log('📝 [MONOBANK] Parsing webhook data:', body);

      const { data, signature } = body;

      if (!data || !signature) {
        throw new Error('Missing data or signature in webhook');
      }

      // Перевірка підпису
      if (!this.verifyWebhookSignature(JSON.stringify(data), signature)) {
        throw new Error('Invalid webhook signature');
      }

      return data as MonobankCallbackData;
    } catch (error) {
      console.error('💥 [MONOBANK] Error parsing webhook data:', error);
      throw error;
    }
  }

  mapMonobankStatus(status: string): 'completed' | 'failed' | 'processing' | 'pending' {
    console.log('🔍 [MONOBANK] Mapping status:', status);

    switch (status) {
      case 'success':
        console.log('✅ [MONOBANK] Status mapped to completed');
        return 'completed';
      case 'failure':
      case 'expired':
      case 'reversed':
        console.log('❌ [MONOBANK] Status mapped to failed');
        return 'failed';
      case 'processing':
        console.log('⏳ [MONOBANK] Status mapped to processing');
        return 'processing';
      case 'created':
        console.log('⏳ [MONOBANK] Status mapped to pending');
        return 'pending';
      default:
        console.log('⏳ [MONOBANK] Unknown status, mapping to processing');
        return 'processing';
    }
  }

  async getWalletCards(walletId: string): Promise<any> {
    try {
      console.log('🃏 [MONOBANK] Getting wallet cards:', walletId);

      const response = await fetch(`${this.baseUrl}/api/merchant/wallet/${walletId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MONOBANK] Get wallet cards error:', response.status, errorText);
        
        // Якщо гаманець не знайдено або пустий, повертаємо пустий масив
        if (response.status === 404) {
          console.log('📭 [MONOBANK] No cards found for wallet:', walletId);
          return { cards: [] };
        }
        
        throw new Error(`Monobank API error: ${response.status} ${errorText}`);
      }

      const walletData = await response.json() as any;
      console.log('✅ [MONOBANK] Wallet data:', walletData);

      // Повертаємо дані в очікуваному форматі
      return walletData.cards || walletData || [];
    } catch (error) {
      console.error('💥 [MONOBANK] Error getting wallet cards:', error);
      throw error;
    }
  }

  async createRecurringPayment(cardToken: string, amount: number, description: string, reference?: string): Promise<any> {
    try {
      console.log('🔄 [MONOBANK] Creating recurring payment:', { amount, description });

      const paymentRequest = {
        cardToken: cardToken,
        amount: Math.round(amount * 100), // в копійках
        ccy: 980, // UAH
        redirectUrl: `${this.resultUrl}?recurring=true`,
        webHookUrl: this.callbackUrl,
        initiationKind: 'merchant', // платіж з ініціативи мерчанта
        merchantPaymInfo: {
          reference: reference || `recurring_${Date.now()}`,
          destination: description.substring(0, 255),
          comment: 'Регулярний платіж',
          customerEmails: [], // можна додати email користувача
          paymentType: 'debit' // стандартна операція
        }
      };

      const response = await fetch(`${this.baseUrl}/api/merchant/wallet/payment`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MONOBANK] Recurring payment error:', response.status, errorText);
        throw new Error(`Monobank API error: ${response.status} ${errorText}`);
      }

      const result = await response.json() as any;
      console.log('✅ [MONOBANK] Recurring payment created:', result);

      return result;
    } catch (error) {
      console.error('💥 [MONOBANK] Error creating recurring payment:', error);
      throw error;
    }
  }

  private generateCheckoutForm(pageUrl: string): string {
    return `
<form method="GET" action="${pageUrl}" target="_blank">
  <button type="submit" style="
    background-color: #000000;
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  ">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
    Оплатити через Monobank
  </button>
</form>`;
  }
}

export default MonobankService;
