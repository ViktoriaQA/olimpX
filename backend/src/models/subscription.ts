export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration_months: number;
  features: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  user_id: string;
  package_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  start_date: Date;
  end_date: Date;
  auto_renew: boolean;
  // Legacy LiqPay fields
  liqpay_payment_id?: string;
  liqpay_rec_token?: string;
  // New Monobank fields
  monobank_invoice_id?: string;
  monobank_token?: string;
  payment_gateway: 'liqpay' | 'monobank';
  created_at: Date;
  updated_at: Date;
}

export interface PaymentAttempt {
  id: string;
  user_id: string;
  order_id: string;
  payment_id: string;
  checkout_id?: string;
  checkout_url?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  order_type: 'one-time' | 'recurring';
  package_id?: string;
  subscription_id?: string;
  callback_data?: any;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Receipt {
  id: string;
  order_id: string;
  payment_id: string;
  user_id: string;
  pdf_data?: string;
  html_data?: string;
  file_path?: string;
  created_at: Date;
}

export interface InitiateSubscriptionRequest {
  package_id: string;
  billing_cycle: 'monthly' | 'yearly';
}

export interface InitiateSubscriptionResponse {
  checkout_url: string;
  order_id: string;
  payment_id: string;
}

export interface PaymentStatusResponse {
  order_id: string;
  status: string;
  amount: number;
  currency: string;
  subscription_id?: string;
  error_message?: string;
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
  signature: string;
}

export interface LiqPayCallbackData {
  payment_id: string;
  status: string;
  transaction_id?: string;
  order_id: string;
  amount: number;
  currency: string;
  description?: string;
  result?: string;
  response_code?: string;
  rec_token?: string;
  create_date: string;
  end_date?: string;
  public_key: string;
  acq_id?: string;
  card_token?: string;
  card_type?: string;
  ip?: string;
  info?: string;
  commission?: number;
  commission_credit?: number;
  amount_debit?: number;
  amount_credit?: number;
  currency_debit?: string;
  currency_credit?: string;
  sender_card_bank?: string;
  sender_card_country?: string;
  sender_card_mask2?: string;
  receiver_card_bank?: string;
  receiver_card_country?: string;
  receiver_card_mask2?: string;
  ip_country?: string;
  mpi_eci?: string;
  is_3ds?: string;
  product_category?: string;
  product_description?: string;
  product_name?: string;
  product_url?: string;
  product_count?: string;
  product_price?: string;
  liability?: string;
  fawry_code?: string;
  card_brand?: string;
  customer?: string;
  bonus?: number;
  bonus_credit?: number;
  invoice_id?: string;
  payment_system?: string;
  payment_method?: string;
  card_product?: string;
  card_category?: string;
  token?: string;
  token_card_mask2?: string;
  token_card_bank?: string;
  token_card_country?: string;
  token_card_type?: string;
  token_card_brand?: string;
  token_card_product?: string;
  token_card_category?: string;
  token_card_status?: string;
  token_card_exp?: string;
  token_card_token?: string;
  token_card_rec_token?: string;
}

export interface PaymentRequest {
  order_id: string;
  amount: number;
  currency: string;
  description: string;
  result_url?: string;
  server_url?: string;
  order_type: 'one-time' | 'recurring';
  language?: string;
  expire_date?: string;
  recurring_by_token?: boolean;
  customer?: string;
  email?: string;
  phone?: string;
  card_token?: string;
  split_rules?: any;
  split_test?: boolean;
  dae?: string;
  dae_info?: string;
  product_category?: string;
  product_description?: string;
  product_name?: string;
  product_url?: string;
  product_count?: number;
  product_price?: number;
  delivery_address?: string;
  delivery_city?: string;
  delivery_country?: string;
  delivery_state?: string;
  delivery_postcode?: string;
  sandbox?: boolean;
  version?: string;
}

export interface PaymentResponse {
  checkout_url: string;
  checkout_form?: string;
  data?: string;
  signature?: string;
  payment_id: string;
  order_id: string;
  status: 'completed' | 'failed' | 'processing' | 'pending' | string;
  amount: number;
  currency: string;
  description: string;
  result_url?: string;
  server_url?: string;
  order_type: string;
  language?: string;
  expire_date?: string;
  create_date: string;
  end_date?: string;
  public_key: string;
  result?: string;
  response_code?: string;
  acq_id?: string;
  card_token?: string;
  card_type?: string;
  ip?: string;
  info?: string;
  commission?: number;
  commission_credit?: number;
  amount_debit?: number;
  amount_credit?: number;
  currency_debit?: string;
  currency_credit?: string;
  sender_card_bank?: string;
  sender_card_country?: string;
  sender_card_mask2?: string;
  receiver_card_bank?: string;
  receiver_card_country?: string;
  receiver_card_mask2?: string;
  ip_country?: string;
  mpi_eci?: string;
  is_3ds?: string;
  product_category?: string;
  product_description?: string;
  product_name?: string;
  product_url?: string;
  product_count?: string;
  product_price?: string;
  liability?: string;
  fawry_code?: string;
  card_brand?: string;
  customer?: string;
  bonus?: number;
  bonus_credit?: number;
  invoice_id?: string;
  payment_system?: string;
  payment_method?: string;
  card_product?: string;
  card_category?: string;
  token?: string;
  token_card_mask2?: string;
  token_card_bank?: string;
  token_card_country?: string;
  token_card_type?: string;
  token_card_brand?: string;
  token_card_product?: string;
  token_card_category?: string;
  token_card_status?: string;
  token_card_exp?: string;
  token_card_token?: string;
  token_card_rec_token?: string;
}
