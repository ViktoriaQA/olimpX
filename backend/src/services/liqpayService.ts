import crypto from 'crypto';
import { PaymentRequest, PaymentResponse, LiqPayCallbackData } from '../models/subscription';

export class LiqPayService {
  private publicKey: string;
  private privateKey: string;
  private callbackUrl: string;
  private resultUrl: string;
  private sandbox: boolean;

  constructor() {
    this.publicKey = process.env.LIQPAY_PUBLIC_KEY || '';
    this.privateKey = process.env.LIQPAY_PRIVATE_KEY || '';
    this.callbackUrl = process.env.LIQPAY_CALLBACK_URL || '';
    this.resultUrl = process.env.LIQPAY_RESULT_URL || '';
    this.sandbox = process.env.NODE_ENV !== 'production';

    if (!this.publicKey || !this.privateKey) {
      throw new Error('LiqPay public and private keys are required');
    }
  }

  private generateSignature(data: string): string {
    return crypto
      .createHash('sha1')
      .update(this.privateKey + data + this.privateKey)
      .digest('base64');
  }

  private base64Encode(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private base64Decode(data: string): any {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  }

  async createPaymentURL(request: PaymentRequest): Promise<PaymentResponse> {
    const requestData = {
      public_key: this.publicKey,
      version: '3',
      action: 'pay',
      amount: request.amount,
      currency: request.currency || 'UAH',
      description: request.description,
      order_id: request.order_id,
      result_url: request.result_url || this.resultUrl,
      server_url: request.server_url || this.callbackUrl,
      language: request.language || 'uk',
      expire_date: request.expire_date,
      order_type: request.order_type,
      recurring_by_token: request.recurring_by_token || false,
      customer: request.customer,
      email: request.email,
      phone: request.phone,
      card_token: request.card_token,
      split_rules: request.split_rules,
      split_test: request.split_test,
      dae: request.dae,
      dae_info: request.dae_info,
      product_category: request.product_category,
      product_description: request.product_description,
      product_name: request.product_name,
      product_url: request.product_url,
      product_count: request.product_count,
      product_price: request.product_price,
      delivery_address: request.delivery_address,
      delivery_city: request.delivery_city,
      delivery_country: request.delivery_country,
      delivery_state: request.delivery_state,
      delivery_postcode: request.delivery_postcode,
      sandbox: this.sandbox,
    };

    const data = this.base64Encode(requestData);
    const signature = this.generateSignature(data);

    const checkoutUrl = `https://www.liqpay.ua/api/3/checkout?data=${encodeURIComponent(data)}&signature=${encodeURIComponent(signature)}`;

    // Make API call to get payment details
    const apiResponse = await this.makeApiCall({
      action: 'pay',
      public_key: this.publicKey,
      version: '3',
      amount: request.amount,
      currency: request.currency || 'UAH',
      description: request.description,
      order_id: request.order_id,
      result_url: request.result_url || this.resultUrl,
      server_url: request.server_url || this.callbackUrl,
      language: request.language || 'uk',
      expire_date: request.expire_date,
      order_type: request.order_type,
      recurring_by_token: request.recurring_by_token || false,
      customer: request.customer,
      email: request.email,
      phone: request.phone,
      card_token: request.card_token,
      split_rules: request.split_rules,
      split_test: request.split_test,
      dae: request.dae,
      dae_info: request.dae_info,
      product_category: request.product_category,
      product_description: request.product_description,
      product_name: request.product_name,
      product_url: request.product_url,
      product_count: request.product_count,
      product_price: request.product_price,
      delivery_address: request.delivery_address,
      delivery_city: request.delivery_city,
      delivery_country: request.delivery_country,
      delivery_state: request.delivery_state,
      delivery_postcode: request.delivery_postcode,
      sandbox: this.sandbox,
    });

    return {
      checkout_url: checkoutUrl,
      payment_id: apiResponse.payment_id,
      order_id: apiResponse.order_id,
      status: apiResponse.status,
      amount: apiResponse.amount,
      currency: apiResponse.currency,
      description: apiResponse.description,
      result_url: apiResponse.result_url,
      server_url: apiResponse.server_url,
      order_type: apiResponse.order_type,
      language: apiResponse.language,
      expire_date: apiResponse.expire_date,
      create_date: apiResponse.create_date,
      end_date: apiResponse.end_date,
      public_key: apiResponse.public_key,
      acq_id: apiResponse.acq_id,
      card_token: apiResponse.card_token,
      card_type: apiResponse.card_type,
      ip: apiResponse.ip,
      info: apiResponse.info,
      commission: apiResponse.commission,
      commission_credit: apiResponse.commission_credit,
      amount_debit: apiResponse.amount_debit,
      amount_credit: apiResponse.amount_credit,
      currency_debit: apiResponse.currency_debit,
      currency_credit: apiResponse.currency_credit,
      sender_card_bank: apiResponse.sender_card_bank,
      sender_card_country: apiResponse.sender_card_country,
      sender_card_mask2: apiResponse.sender_card_mask2,
      receiver_card_bank: apiResponse.receiver_card_bank,
      receiver_card_country: apiResponse.receiver_card_country,
      receiver_card_mask2: apiResponse.receiver_card_mask2,
      ip_country: apiResponse.ip_country,
      mpi_eci: apiResponse.mpi_eci,
      is_3ds: apiResponse.is_3ds,
      product_category: apiResponse.product_category,
      product_description: apiResponse.product_description,
      product_name: apiResponse.product_name,
      product_url: apiResponse.product_url,
      product_count: apiResponse.product_count,
      product_price: apiResponse.product_price,
      liability: apiResponse.liability,
      fawry_code: apiResponse.fawry_code,
      card_brand: apiResponse.card_brand,
      customer: apiResponse.customer,
      bonus: apiResponse.bonus,
      bonus_credit: apiResponse.bonus_credit,
      invoice_id: apiResponse.invoice_id,
      payment_system: apiResponse.payment_system,
      payment_method: apiResponse.payment_method,
      card_product: apiResponse.card_product,
      card_category: apiResponse.card_category,
      token: apiResponse.token,
      token_card_mask2: apiResponse.token_card_mask2,
      token_card_bank: apiResponse.token_card_bank,
      token_card_country: apiResponse.token_card_country,
      token_card_type: apiResponse.token_card_type,
      token_card_brand: apiResponse.token_card_brand,
      token_card_product: apiResponse.token_card_product,
      token_card_category: apiResponse.token_card_category,
      token_card_status: apiResponse.token_card_status,
      token_card_exp: apiResponse.token_card_exp,
      token_card_token: apiResponse.token_card_token,
      token_card_rec_token: apiResponse.token_card_rec_token,
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

    const response = await fetch('https://www.liqpay.ua/api/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`Failed to get receipt: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async makeApiCall(data: any): Promise<any> {
    const requestData = this.base64Encode(data);
    const signature = this.generateSignature(requestData);

    const response = await fetch('https://www.liqpay.ua/api/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: requestData,
        signature: signature,
      }),
    });

    if (!response.ok) {
      throw new Error(`LiqPay API error: ${response.statusText}`);
    }

    const result = await response.json() as any;
    
    if (result.status && result.status === 'error') {
      throw new Error(`LiqPay error: ${result.err_description || result.message}`);
    }

    return result;
  }

  mapLiqPayStatusWithResult(status: string, result?: string, responseCode?: string): 'completed' | 'failed' | 'processing' {
    // Approved or successful payments
    if (status === 'approved' || status === 'success') {
      return 'completed';
    }

    // Failed payments
    if (status === 'failed' || status === 'error' || status === 'expired') {
      return 'failed';
    }

    // Processing payments
    if (status === 'processing' || status === 'wait_secure' || status === 'wait_accept') {
      return 'processing';
    }

    // Check result and response_code for additional validation
    if (result === 'ok' && responseCode === 'ok') {
      return 'completed';
    }

    if (result === 'error' || responseCode === 'error') {
      return 'failed';
    }

    // Default to processing for unknown statuses
    return 'processing';
  }
}

export default LiqPayService;
