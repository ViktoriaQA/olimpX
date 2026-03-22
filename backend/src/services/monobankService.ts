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
  webHookUrl?: string; // URL для callback (опціонально)
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

export interface MonobankSubscriptionRequest {
  amount: number; // в копійках
  ccy: number; // 980 - UAH
  redirectUrl: string;
  webHookUrls: {
    chargeUrl: string;
    statusUrl: string;
  };
  interval: string; // "{число}{одиниця}", приклади: "1d", "2w", "1m", "1y"
  validity?: number; // в секундах, за замовчуванням 24 години
}

export interface MonobankSubscriptionResponse {
  subscriptionId: string;
  pageUrl: string;
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
      console.log('🚀 [MONOBANK] Creating invoice...');
      console.log('📋 [MONOBANK] Request details:', {
        order_id: request.order_id,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        order_type: request.order_type,
        customer: request.customer,
        product_name: request.product_name
      });

      // Конвертація суми з гривень в копійки
      const amountInKopiyky = Math.round(request.amount * 100);
      console.log('💰 [MONOBANK] Amount conversion:', {
        original: request.amount,
        converted: amountInKopiyky,
        currency: 'UAH'
      });

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
        // webHookUrl: this.callbackUrl, // Monobank не підтримує webhook'и через інтерфейс
        validity: 3600, // 1 година
        paymentMethod: 'card',
        // saveCardData: request.order_type === 'recurring' ? {
        //   saveCard: true,
        //   walletId: request.customer || `user_${request.order_id.split('_')[1]}` // використовуємо user_id як walletId
        // } : undefined,
      };

      console.log('📝 [MONOBANK] Invoice request prepared:', JSON.stringify(invoiceRequest, null, 2));
      console.log('🌐 [MONOBANK] API endpoint:', `${this.baseUrl}/api/merchant/invoice/create`);

      const response = await fetch(`${this.baseUrl}/api/merchant/invoice/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(invoiceRequest),
      });

      console.log('📡 [MONOBANK] API response status:', response.status);
      console.log('📡 [MONOBANK] API response headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MONOBANK] API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          url: `${this.baseUrl}/api/merchant/invoice/create`
        });
        throw new Error(`Monobank API error: ${response.status} ${errorText}`);
      }

      const invoiceData: MonobankInvoiceResponse = await response.json() as MonobankInvoiceResponse;
      console.log('✅ [MONOBANK] Invoice created successfully');
      console.log('🔍 [MONOBANK] Response details:', {
        invoiceId: invoiceData.invoiceId,
        pageUrl: invoiceData.pageUrl,
        status: invoiceData.status,
        creationDate: invoiceData.creationDate,
        amount: invoiceData.amount,
        finalAmount: invoiceData.finalAmount
      });

      const paymentResponse: PaymentResponse = {
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

      console.log('🎯 [MONOBANK] Payment response prepared:', {
        checkout_url: paymentResponse.checkout_url,
        payment_id: paymentResponse.payment_id,
        order_id: paymentResponse.order_id,
        status: paymentResponse.status,
        amount: paymentResponse.amount
      });

      return paymentResponse;
    } catch (error) {
      console.error('💥 [MONOBANK] Error creating invoice:', error);
      console.error('💥 [MONOBANK] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        requestId: request.order_id,
        requestAmount: request.amount
      });
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
      console.log('📝 [MONOBANK] Data length:', data.length);
      console.log('🔑 [MONOBANK] Signature length:', signature.length);
      console.log('🔧 [MONOBANK] Webhook secret configured:', !!this.webhookSecret);

      if (!this.webhookSecret) {
        console.warn('⚠️ [MONOBANK] Webhook secret not configured, skipping verification');
        console.warn('⚠️ [MONOBANK] This should only happen in development environment');
        return true; // для розробки
      }

      console.log('🔧 [MONOBANK] Using webhook secret for verification');
      
      // Перевірка ECDSA підпису
      const publicKey = crypto.createPublicKey(this.webhookSecret);
      console.log('🔑 [MONOBANK] Public key created successfully');
      
      const dataBuffer = Buffer.from(data);
      const signatureBuffer = Buffer.from(signature, 'base64');
      
      console.log('📊 [MONOBANK] Buffer sizes:', {
        data: dataBuffer.length,
        signature: signatureBuffer.length
      });
      
      const isVerified = crypto.verify(
        'sha256',
        dataBuffer,
        {
          key: publicKey,
          format: 'pem',
          type: 'spki',
        },
        signatureBuffer
      );

      console.log(isVerified ? '✅ [MONOBANK] Signature verified successfully' : '❌ [MONOBANK] Invalid signature');
      console.log('🔍 [MONOBANK] Verification result details:', {
        algorithm: 'sha256',
        keyFormat: 'pem',
        keyType: 'spki',
        isValid: isVerified
      });
      
      return isVerified;
    } catch (error) {
      console.error('💥 [MONOBANK] Error verifying signature:', error);
      console.error('💥 [MONOBANK] Signature verification error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        dataLength: data.length,
        signatureLength: signature.length,
        hasWebhookSecret: !!this.webhookSecret
      });
      return false;
    }
  }

  parseWebhookData(body: any): MonobankCallbackData {
    try {
      console.log('📝 [MONOBANK] Parsing webhook data...');
      console.log('📋 [MONOBANK] Raw body:', JSON.stringify(body, null, 2));
      console.log('🔍 [MONOBANK] Body structure:', {
        hasData: !!body.data,
        hasSignature: !!body.signature,
        dataKeys: body.data ? Object.keys(body.data) : [],
        signatureLength: body.signature ? body.signature.length : 0
      });

      const { data, signature } = body;

      if (!data || !signature) {
        console.log('❌ [MONOBANK] Missing required fields:', {
          hasData: !!data,
          hasSignature: !!signature,
          bodyKeys: Object.keys(body)
        });
        throw new Error('Missing data or signature in webhook');
      }

      console.log('🔐 [MONOBANK] Verifying webhook signature...');
      console.log('🔑 [MONOBANK] Signature provided:', signature.substring(0, 20) + '...');
      console.log('📝 [MONOBANK] Data to verify:', JSON.stringify(data));
      
      // Перевірка підпису
      const isSignatureValid = this.verifyWebhookSignature(JSON.stringify(data), signature);
      console.log(isSignatureValid ? '✅ [MONOBANK] Signature verified successfully' : '❌ [MONOBANK] Invalid signature');
      
      if (!isSignatureValid) {
        console.log('❌ [MONOBANK] Webhook signature verification failed');
        console.log('⚠️ [MONOBANK] Possible security issue - invalid signature');
        throw new Error('Invalid webhook signature');
      }

      console.log('✅ [MONOBANK] Webhook data parsed successfully');
      console.log('📊 [MONOBANK] Parsed callback data:', JSON.stringify(data, null, 2));
      
      const callbackData = data as MonobankCallbackData;
      console.log('💰 [MONOBANK] Payment details:', {
        invoiceId: callbackData.invoiceId,
        amount: callbackData.amount / 100,
        currency: callbackData.ccy === 980 ? 'UAH' : 'Other',
        status: callbackData.status,
        reference: callbackData.merchantPaymInfo?.reference,
        timestamp: new Date(callbackData.timestamp * 1000).toISOString()
      });

      return callbackData;
    } catch (error) {
      console.error('💥 [MONOBANK] Error parsing webhook data:', error);
      console.error('💥 [MONOBANK] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        bodyReceived: !!body,
        bodyType: typeof body
      });
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

  async createSubscription(request: MonobankSubscriptionRequest): Promise<MonobankSubscriptionResponse> {
    try {
      console.log('🔄 [MONOBANK] Creating recurring subscription...');
      console.log('📋 [MONOBANK] Request details:', {
        amount: request.amount / 100,
        currency: request.ccy === 980 ? 'UAH' : 'Other',
        interval: request.interval,
        validity: request.validity,
        redirectUrl: request.redirectUrl
      });

      console.log('📝 [MONOBANK] Subscription request prepared:', JSON.stringify(request, null, 2));
      console.log('🌐 [MONOBANK] API endpoint:', `${this.baseUrl}/api/merchant/subscription/create`);

      const response = await fetch(`${this.baseUrl}/api/merchant/subscription/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      console.log('📡 [MONOBANK] Subscription API response status:', response.status);
      console.log('📡 [MONOBANK] API response headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('❌ [MONOBANK] Failed to parse error response:', errorText);
          errorData = { errText: errorText };
        }

        console.error('❌ [MONOBANK] Subscription API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorData,
          url: `${this.baseUrl}/api/merchant/subscription/create`
        });

        // Handle specific error codes according to MonoBank documentation
        const errorMessage = this.handleSubscriptionError(response.status, errorData);
        throw new Error(errorMessage);
      }

      const subscriptionData: MonobankSubscriptionResponse = await response.json() as MonobankSubscriptionResponse;
      console.log('✅ [MONOBANK] Recurring subscription created successfully');
      console.log('🔍 [MONOBANK] Response details:', {
        subscriptionId: subscriptionData.subscriptionId,
        pageUrl: subscriptionData.pageUrl
      });

      console.log('🎯 [MONOBANK] Recurring subscription response prepared');
      return subscriptionData;
    } catch (error) {
      console.error('💥 [MONOBANK] Error creating recurring subscription:', error);
      console.error('💥 [MONOBANK] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        requestAmount: request.amount / 100,
        requestInterval: request.interval
      });
      throw error;
    }
  }

  private handleSubscriptionError(status: number, errorData: any): string {
    console.log('🔍 [MONOBANK] Handling subscription error...');
    console.log('📊 [MONOBANK] Error status:', status);
    console.log('📝 [MONOBANK] Error data:', errorData);

    switch (status) {
      case 400:
        const errCode400 = errorData?.errCode;
        console.log('⚠️ [MONOBANK] Bad Request Error Code:', errCode400);
        
        switch (errCode400) {
          case 'BAD_REQUEST':
          case '1001':
            return 'Некоректний запит - перевірте параметри та спробуйте ще раз';
          
          case 'INVALID_MERCHANT_PAYM_INFO':
            return 'Некоректні дані продавця - перевірте інформацію про платіж';
          
          case 'ORDER_IN_PROGRESS':
            return 'Платіж вже в процесі обробки - очікуйте завершення або створіть новий';
          
          case 'HOLD_INVOICE_NOT_FINALIZED':
            return 'Рахунок з утриманням не фіналізовано - зверніться до підтримки';
          
          case 'WRONG_CANCEL_AMOUNT':
            return 'Некоректна сума для скасування - перевірте суму платежу';
          
          case 'TOKEN_NOT_FOUND':
            return 'Токен картки не знайдено - створіть новий платіж';
          
          default:
            return `Помилка запиту: ${errorData?.errText || 'Невідома помилка 400'}`;
        }

      case 403:
        if (errorData?.errCode === 'FORBIDDEN') {
          return 'Токен доступу недійсний - перевірте X-Token в заголовках';
        }
        return 'Доступ заборонено - перевірте права доступу';

      case 404:
        if (errorData?.errCode === 'NOT_FOUND' || errorData?.errCode === '1004') {
          return 'Ресурс не знайдено - перевірте параметри запиту';
        }
        return 'Ресурс не знайдено';

      case 405:
        return 'Метод HTTP не підтримується - використайте POST для цього ендпоінту';

      case 429:
        if (errorData?.errCode === 'TMR') {
          return 'Забагато запитів - зачекайте деякий час перед наступною спробою';
        }
        return 'Забагато запитів - тимчасово обмежено';

      case 500:
        const errCode500 = errorData?.errCode;
        console.log('💥 [MONOBANK] Internal Server Error Code:', errCode500);
        
        switch (errCode500) {
          case 'INTERNAL_ERROR':
            return 'Внутрішня помилка сервера - спробуйте пізніше або зверніться до підтримки';
          
          case 'CANCEL_NOT_AVAILABLE':
            return 'Скасування платежу недоступне - зверніться до підтримки';
          
          default:
            return `Внутрішня помилка: ${errorData?.errText || 'Невідома помилка 500'}`;
        }

      default:
        return `Помилка MonoBank (${status}): ${errorData?.errText || 'Невідома помилка'}`;
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
