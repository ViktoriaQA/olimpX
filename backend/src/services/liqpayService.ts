import crypto from 'crypto';
import { PaymentRequest, PaymentResponse, LiqPayCallbackData } from '../models/subscription';

export class LiqPayService {
  private publicKey: string;
  private privateKey: string;
  private callbackUrl: string;
  private resultUrl: string;
  private sandbox: boolean;

  constructor() {
    // Log environment variables for debugging
    console.log('Environment variables during LiqPay init:');
    console.log('LIQPAY_PUBLIC_KEY from env:', process.env.LIQPAY_PUBLIC_KEY);
    console.log('LIQPAY_PRIVATE_KEY from env:', process.env.LIQPAY_PRIVATE_KEY);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Use standard LiqPay demo credentials
    this.publicKey =  process.env.LIQPAY_PUBLIC_KEY || '';
    this.privateKey = process.env.LIQPAY_PRIVATE_KEY || '';
    this.callbackUrl = process.env.LIQPAY_CALLBACK_URL || '';
    this.resultUrl = process.env.LIQPAY_RESULT_URL || '';
    this.sandbox = process.env.NODE_ENV !== 'production';
    
    // For debugging: log the keys being used
    console.log('LiqPay Service initialized with public key:', this.publicKey);
    console.log('Sandbox mode:', this.sandbox);
  }

  private generateSignature(data: string): string {
    const signatureString = this.privateKey + data + this.privateKey;
    return crypto
      .createHash('sha1')
      .update(signatureString)
      .digest('base64');
  }

  private base64Encode(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private base64Decode(data: string): any {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  }

  async createPaymentURL(request: PaymentRequest): Promise<PaymentResponse> {
    console.log('LiqPay publicKey:', this.publicKey);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Generate checkout form for POST submission to LiqPay
    const requestData = {
      version: '3',
      public_key: this.publicKey,
      action: 'pay',
      amount: request.amount,
      currency: request.currency || 'UAH',
      description: request.description,
      order_id: request.order_id,
      result_url: request.result_url || this.resultUrl,
      server_url: request.server_url || this.callbackUrl,
      language: request.language || 'uk',
      sandbox: this.sandbox,
      expired_date: request.expire_date,
    };

    const data = this.base64Encode(requestData);
    const signature = this.generateSignature(data);

    console.log('LiqPay request data:', requestData);
    console.log('LiqPay encoded data:', data);

    // Generate checkout form for POST submission to LiqPay
    const checkoutForm = `
<form method="POST" action="https://www.liqpay.ua/api/3/checkout">
  <input type="hidden" name="data" value="${data}"/>
  <input type="hidden" name="signature" value="${signature}"/>
  <button type="submit">Pay with LiqPay</button>
</form>`;
    
    console.log('Generated checkout form:', checkoutForm);

    // Return checkout URL with data and signature as query parameters for GET redirect
    const checkoutUrl = `https://www.liqpay.ua/api/3/checkout?data=${encodeURIComponent(data)}&signature=${encodeURIComponent(signature)}`;

    return {
      checkout_url: checkoutUrl,
      checkout_form: checkoutForm,
      data: data,
      signature: signature,
      payment_id: `checkout_${Date.now()}`,
      order_id: request.order_id,
      status: 'checkout',
      amount: request.amount,
      currency: request.currency || 'UAH',
      description: request.description,
      result_url: request.result_url || this.resultUrl,
      server_url: request.server_url || this.callbackUrl,
      language: request.language || 'uk',
      order_type: request.order_type || 'recurring',
      create_date: new Date().toISOString(),
      public_key: this.publicKey,
    };
  }

  async parseCallback(data: string, signature: string): Promise<LiqPayCallbackData> {
    // Verify signature
    const expectedSignature = this.generateSignature(data);
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode and parse data
    const callbackData = this.base64Decode(data) as LiqPayCallbackData;
    
    // Verify public key
    if (callbackData.public_key !== this.publicKey) {
      throw new Error('Invalid public key');
    }

    return callbackData;
  }

  async checkPaymentStatus(orderId: string): Promise<PaymentResponse> {
    const requestData = {
      action: 'status',
      public_key: this.publicKey,
      version: '3',
      order_id: orderId,
    };

    return await this.makeApiCall(requestData);
  }

  async getReceiptPDF(orderId: string, paymentId: string): Promise<Buffer> {
    const requestData = {
      action: 'invoice',
      public_key: this.publicKey,
      version: '3',
      order_id: orderId,
      payment_id: paymentId,
    };

    const apiUrl = 'https://www.liqpay.ua/api/request';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        data: this.base64Encode(requestData),
        signature: this.generateSignature(this.base64Encode(requestData)),
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get receipt: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async makeApiCall(data: any): Promise<any> {
    const requestData = this.base64Encode(data);
    const signature = this.generateSignature(requestData);

    // Use correct LiqPay API endpoints
    const apiUrl = 'https://www.liqpay.ua/api/request';
    
    console.log('LiqPay API call:', {
      apiUrl,
      publicKey: this.publicKey,
      sandbox: this.sandbox,
      requestDataPreview: this.base64Decode(requestData)
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        data: requestData,
        signature: signature,
      }).toString(),
    });

    if (!response.ok) {
      console.error('LiqPay API response error:', response.status, response.statusText);
      throw new Error(`LiqPay API error: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('LiqPay API raw response:', responseText);
    console.log('Response type:', typeof responseText);
    console.log('Is responseText empty?', !responseText);
    
    // Liqpay returns base64 encoded data in the response
    let result;
    try {
      // Try to parse as JSON first (for error responses)
      result = JSON.parse(responseText);
      console.log('Parsed as JSON:', result);
    } catch (e) {
      // If it's not JSON, it's likely base64 encoded data
      try {
        console.log('Trying to decode as base64...');
        const decodedData = this.base64Decode(responseText);
        console.log('Decoded data:', decodedData);
        result = decodedData;
      } catch (decodeError) {
        console.error('Base64 decode error:', decodeError);
        throw new Error(`Invalid LiqPay response format: ${responseText}`);
      }
    }
    
    console.log('LiqPay API parsed response:', result);
    
    if (result.status && result.status === 'error') {
      throw new Error(`LiqPay error: ${result.err_description || result.message}`);
    }

    return result;
  }

  mapLiqPayStatusWithResult(status: string, result?: string, responseCode?: string): 'completed' | 'failed' | 'processing' {
    console.log('🔍 [LIQPAY] Mapping status:', { status, result, responseCode });
    
    // Approved or successful payments
    if (status === 'approved' || status === 'success') {
      console.log('✅ [LIQPAY] Status mapped to completed');
      return 'completed';
    }

    // Failed payments
    if (status === 'failed' || status === 'error' || status === 'expired') {
      console.log('❌ [LIQPAY] Status mapped to failed');
      return 'failed';
    }

    // Processing payments
    if (status === 'processing' || status === 'wait_secure' || status === 'wait_accept') {
      console.log('⏳ [LIQPAY] Status mapped to processing');
      return 'processing';
    }

    // Check result and response_code for additional validation
    if (result === 'ok' && responseCode === 'ok') {
      console.log('✅ [LIQPAY] Result mapped to completed');
      return 'completed';
    }

    if (result === 'error' || responseCode === 'error') {
      console.log('❌ [LIQPAY] Result mapped to failed');
      return 'failed';
    }

    // Default to processing for unknown statuses
    console.log('⏳ [LIQPAY] Default mapping to processing');
    return 'processing';
  }
}

export default LiqPayService;
