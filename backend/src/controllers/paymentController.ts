import { Request, Response } from 'express';
import MonobankService from '../services/monobankService';
import RecurringService from '../services/recurringService';
import TelegramService from '../services/telegramService';
import { AuthenticatedRequest } from '../types/auth';
import { 
  InitiateSubscriptionRequest, 
  InitiateSubscriptionResponse,
  PaymentStatusResponse,
  PaymentAttempt,
  Package,
  Subscription
} from '../models/subscription';
import { supabase } from '../utils/supabase';
import { MonobankCallbackData } from '../services/monobankService';

export class PaymentController {
  private monobankService: MonobankService;
  private recurringService: RecurringService;
  private telegramService: TelegramService;

  constructor() {
    this.monobankService = new MonobankService();
    this.recurringService = new RecurringService();
    this.telegramService = new TelegramService();
  }

  async initiateSubscriptionPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🚀 [PAYMENT] Initiating subscription payment...');
      console.log('📋 [PAYMENT] Request body:', req.body);
      
      const userId = req.user?.id;
      if (!userId) {
        console.log('❌ [PAYMENT] Unauthorized - no user ID');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { package_id, billing_cycle }: InitiateSubscriptionRequest = req.body;
      console.log('📦 [PAYMENT] Package ID:', package_id, 'Billing cycle:', billing_cycle);

      // Validate request
      if (!package_id || !billing_cycle) {
        console.log('❌ [PAYMENT] Missing required fields');
        res.status(400).json({ error: 'package_id and billing_cycle are required' });
        return;
      }

      // Get package details
      console.log('🔍 [PAYMENT] Looking for package with ID:', package_id);
      const packageDetails = await this.getPackageById(package_id);
      console.log('✅ [PAYMENT] Found package:', packageDetails);
      
      if (!packageDetails) {
        console.error('❌ [PAYMENT] Package not found with ID:', package_id);
        res.status(404).json({ error: 'Package not found' });
        return;
      }

      // Calculate amount based on billing cycle
      let amount = packageDetails.price;
      let orderType: 'one-time' | 'recurring' = 'recurring'; // Always recurring for subscriptions
      
      if (billing_cycle === 'yearly') {
        amount = packageDetails.price * 11; // 11 months for yearly (1 month free)
        console.log('💰 [PAYMENT] Yearly billing - calculated amount:', amount);
        // Keep orderType as 'recurring' for auto-renewal, even for yearly billing
      }

      // Generate order ID
      const orderId = `sub_${userId}_${Date.now()}`;
      console.log('🆔 [PAYMENT] Generated order ID:', orderId);

      // Create payment request
      const paymentRequest = {
        order_id: orderId,
        amount: amount,
        currency: packageDetails.currency,
        description: `Оплата за надання доступу до SaaS платформи (програмне забезпечення як послуга) за пакет '${packageDetails.name}'`,
        order_type: orderType,
        customer: userId,
        email: req.user?.email,
        phone: req.user?.phone,
        product_name: packageDetails.name,
        product_description: packageDetails.description,
        product_price: amount,
      };

      console.log('💳 [PAYMENT] Creating payment with Monobank...');
      console.log('📝 [PAYMENT] Payment request:', paymentRequest);

      // Create payment with Monobank
      const paymentResponse = await this.monobankService.createInvoice(paymentRequest);
      console.log('✅ [PAYMENT] Monobank response:', paymentResponse);

      // Store payment attempt
      const paymentAttempt: PaymentAttempt = {
        id: this.generateId(), // Generate proper UUID
        user_id: userId,
        order_id: orderId, // Keep orderId for LiqPay
        payment_id: paymentResponse.payment_id,
        checkout_id: paymentResponse.payment_id,
        checkout_url: paymentResponse.checkout_url,
        amount: amount,
        currency: packageDetails.currency,
        status: 'pending',
        order_type: orderType,
        package_id: package_id,
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log('💾 [PAYMENT] Storing payment attempt:', paymentAttempt);
      await this.storePaymentAttempt(paymentAttempt);
      console.log('✅ [PAYMENT] Payment attempt stored successfully');

      // Return response
      const response: InitiateSubscriptionResponse = {
        checkout_url: paymentResponse.checkout_url,
        order_id: orderId,
        payment_id: paymentResponse.payment_id,
      };

      console.log('🎯 [PAYMENT] Returning response:', response);
      res.json(response);
    } catch (error) {
      console.error('💥 [PAYMENT] Error initiating subscription payment:', error);
      
      // Return actual error message if available
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      console.log('📝 [PAYMENT] Error message:', errorMessage);
      res.status(500).json({ 
        error: 'Payment initiation failed',
        details: errorMessage 
      });
    }
  }

  async handlePaymentCallback(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔔 [CALLBACK] Received Monobank callback...');
      console.log('📋 [CALLBACK] Request body:', req.body);

      // Parse and verify webhook data
      console.log('🔍 [CALLBACK] Parsing Monobank webhook data...');
      const callbackData = this.monobankService.parseWebhookData(req.body);
      console.log('✅ [CALLBACK] Parsed callback data:', callbackData);

      // Update payment attempt status using invoiceId as order_id
      console.log('📝 [CALLBACK] Updating payment attempt status...');
      await this.updatePaymentAttemptStatus(callbackData.merchantPaymInfo.reference, callbackData);

      // Check if payment is successful
      const mappedStatus = this.monobankService.mapMonobankStatus(callbackData.status);
      console.log('📊 [CALLBACK] Mapped status:', mappedStatus);

      // Update status to completed if payment is successful
      if (mappedStatus === 'completed') {
        console.log('🎉 [CALLBACK] Payment completed successfully!');
        await this.updatePaymentAttemptStatus(callbackData.merchantPaymInfo.reference, callbackData, 'completed');
        await this.handleSuccessfulPayment(callbackData);
      }

      console.log('✅ [CALLBACK] Callback processed successfully');
      res.status(200).send('OK');
    } catch (error) {
      console.error('💥 [CALLBACK] Error handling payment callback:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPaymentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const paymentAttempt = await this.getPaymentAttemptByOrderId(orderId);
      if (!paymentAttempt) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      if (paymentAttempt.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // If status is processing, do real-time check
      if (paymentAttempt.status === 'processing') {
        try {
          const invoiceStatus = await this.monobankService.getInvoiceStatus(paymentAttempt.payment_id);
          const mappedStatus = this.monobankService.mapMonobankStatus(invoiceStatus.status);
          
          await this.updatePaymentAttemptStatus(orderId, invoiceStatus);
          paymentAttempt.status = mappedStatus;
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }

      const response: PaymentStatusResponse = {
        order_id: paymentAttempt.order_id,
        status: paymentAttempt.status,
        amount: paymentAttempt.amount,
        currency: paymentAttempt.currency,
        subscription_id: paymentAttempt.subscription_id,
        error_message: paymentAttempt.error_message,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPublicPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const paymentAttempt = await this.getPaymentAttemptByOrderId(orderId);
      if (!paymentAttempt) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      // If status is processing, do real-time check
      if (paymentAttempt.status === 'processing') {
        try {
          const invoiceStatus = await this.monobankService.getInvoiceStatus(paymentAttempt.payment_id);
          const mappedStatus = this.monobankService.mapMonobankStatus(invoiceStatus.status);
          
          await this.updatePaymentAttemptStatus(orderId, invoiceStatus);
          paymentAttempt.status = mappedStatus;
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }

      const response: PaymentStatusResponse = {
        order_id: paymentAttempt.order_id,
        status: paymentAttempt.status,
        amount: paymentAttempt.amount,
        currency: paymentAttempt.currency,
        subscription_id: paymentAttempt.subscription_id,
        error_message: paymentAttempt.error_message,
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting public payment status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const paymentAttempt = await this.getPaymentAttemptByOrderId(orderId);
      if (!paymentAttempt) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      if (paymentAttempt.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Try to get receipt from database first
      let receiptData = await this.getReceiptFromDatabase(orderId);

      if (!receiptData) {
        try {
          // Get PDF from Monobank
          const pdfBuffer = await this.monobankService.getReceipt(paymentAttempt.payment_id);
          
          // Store receipt in database
          await this.storeReceiptInDatabase(orderId, paymentAttempt.payment_id, userId, pdfBuffer);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="receipt_${orderId}.pdf"`);
          res.send(pdfBuffer);
          return;
        } catch (error) {
          console.error('Error getting PDF receipt:', error);
          
          // Fallback to HTML receipt
          const htmlReceipt = this.generateHTMLReceipt(paymentAttempt);
          await this.storeReceiptInDatabase(orderId, paymentAttempt.payment_id, userId, Buffer.from(htmlReceipt), 'html');
          
          res.setHeader('Content-Type', 'text/html');
          res.send(htmlReceipt);
          return;
        }
      }

      // Return stored receipt
      if (receiptData.pdf_data) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt_${orderId}.pdf"`);
        res.send(Buffer.from(receiptData.pdf_data, 'base64'));
      } else if (receiptData.html_data) {
        res.setHeader('Content-Type', 'text/html');
        res.send(receiptData.html_data);
      } else {
        res.status(404).json({ error: 'Receipt not found' });
      }
    } catch (error) {
      console.error('Error getting receipt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async verifySubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🔍 [VERIFY] Verifying subscription...');
      console.log('📋 [VERIFY] Request body:', req.body);
      
      const { session_id } = req.body;
      const userId = req.user?.id;

      console.log('👤 [VERIFY] User ID:', userId, 'Session ID:', session_id);

      if (!userId) {
        console.log('❌ [VERIFY] Unauthorized - no user ID');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!session_id) {
        console.log('❌ [VERIFY] Missing session_id');
        res.status(400).json({ error: 'session_id is required' });
        return;
      }

      // Get payment attempt by order_id (session_id)
      console.log('🔎 [VERIFY] Looking for payment attempt with order_id:', session_id);
      const paymentAttempt = await this.getPaymentAttemptByOrderId(session_id);
      if (!paymentAttempt) {
        console.log('❌ [VERIFY] Payment attempt not found');
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      console.log('✅ [VERIFY] Found payment attempt:', paymentAttempt);

      if (paymentAttempt.user_id !== userId) {
        console.log('❌ [VERIFY] Access denied - user mismatch');
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Check real-time payment status
      try {
        console.log('🔄 [VERIFY] Checking real-time payment status...');
        const invoiceStatus = await this.monobankService.getInvoiceStatus(session_id);
        const mappedStatus = this.monobankService.mapMonobankStatus(invoiceStatus.status);
        
        console.log('📊 [VERIFY] Monobank status:', invoiceStatus);
        console.log('📈 [VERIFY] Mapped status:', mappedStatus);
        
        await this.updatePaymentAttemptStatus(session_id, invoiceStatus);
        paymentAttempt.status = mappedStatus;
      } catch (error) {
        console.error('❌ [VERIFY] Error checking payment status:', error);
      }

      // Only proceed if payment is completed
      if (paymentAttempt.status !== 'completed') {
        console.log('⏳ [VERIFY] Payment not completed, current status:', paymentAttempt.status);
        res.status(400).json({ 
          error: 'Payment not completed',
          status: paymentAttempt.status 
        });
        return;
      }

      console.log('🎉 [VERIFY] Payment completed successfully!');

      // Get package details
      console.log('📦 [VERIFY] Getting package details...');
      const packageDetails = await this.getPackageById(paymentAttempt.package_id!);
      if (!packageDetails) {
        console.log('❌ [VERIFY] Package not found');
        res.status(404).json({ error: 'Package not found' });
        return;
      }

      console.log('✅ [VERIFY] Package details:', packageDetails);

      // Get user's subscription details
      console.log('👥 [VERIFY] Getting user subscription details...');
      const subscription = await this.getUserSubscription(userId, paymentAttempt.package_id!);
      console.log('📋 [VERIFY] User subscription:', subscription);

      const response = {
        success: true,
        subscription: {
          id: paymentAttempt.subscription_id || paymentAttempt.order_id,
          plan_name: packageDetails.name,
          status: 'active',
          start_date: subscription?.start_date || paymentAttempt.created_at.toISOString(),
          end_date: subscription?.end_date,
          price: paymentAttempt.amount,
          duration: paymentAttempt.order_type === 'recurring' ? 'місяць' : 'рік',
          payment_method: 'LiqPay',
          auto_renewal: true, // Subscriptions always have auto-renewal enabled
        }
      };

      console.log('🎯 [VERIFY] Returning response:', response);
      res.json(response);
    } catch (error) {
      console.error('💥 [VERIFY] Error verifying subscription:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getWalletCards(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      console.log('🃏 [WALLET] Getting cards for user:', userId);
      
      // Використовуємо userId як walletId
      const cards = await this.monobankService.getWalletCards(userId);
      
      console.log('✅ [WALLET] Retrieved cards:', cards);
      res.json({ cards, walletId: userId });
    } catch (error) {
      console.error('💥 [WALLET] Error getting wallet cards:', error);
      res.status(500).json({ 
        error: 'Failed to get wallet cards',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createRecurringPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { cardToken, amount, description, package_id } = req.body;

      if (!cardToken || !amount || !description) {
        res.status(400).json({ 
          error: 'Missing required fields',
          required: ['cardToken', 'amount', 'description']
        });
        return;
      }

      console.log('🔄 [RECURRING] Creating recurring payment:', { userId, amount, description });

      const reference = package_id ? `recurring_${userId}_${package_id}_${Date.now()}` : undefined;
      
      const payment = await this.monobankService.createRecurringPayment(
        cardToken,
        amount,
        description,
        reference
      );

      console.log('✅ [RECURRING] Payment created:', payment);
      res.json({
        success: true,
        payment,
        reference
      });
    } catch (error) {
      console.error('💥 [RECURRING] Error creating recurring payment:', error);
      res.status(500).json({ 
        error: 'Failed to create recurring payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async cancelSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const success = await this.recurringService.cancelRecurringSubscription(subscriptionId, userId);
      
      if (success) {
        res.json({ message: 'Subscription cancelled successfully' });
      } else {
        res.status(400).json({ error: 'Failed to cancel subscription' });
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async checkPaymentStatusWithLiqPay(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🔍 [LIQPAY_CHECK] Checking payment status with LiqPay...');
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        console.log('❌ [LIQPAY_CHECK] Unauthorized');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      console.log('🆔 [LIQPAY_CHECK] Order ID:', orderId);

      // Check payment status directly with Monobank
      const invoiceStatus = await this.monobankService.getInvoiceStatus(orderId);
      console.log('📊 [MONOBANK_CHECK] Monobank status:', invoiceStatus);

      // Map Monobank status to our status
      const mappedStatus = this.monobankService.mapMonobankStatus(invoiceStatus.status);

      console.log('📈 [MONOBANK_CHECK] Mapped status:', mappedStatus);

      // Update payment attempt in our database
      await this.updatePaymentAttemptStatus(orderId, invoiceStatus, mappedStatus);

      res.json({
        success: true,
        status: mappedStatus,
        monobankStatus: invoiceStatus.status
      });
    } catch (error) {
      console.error('💥 [LIQPAY_CHECK] Error checking payment status:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to check payment status' 
      });
    }
  }

  private async handleSuccessfulPayment(callbackData: MonobankCallbackData): Promise<void> {
    try {
      const paymentAttempt = await this.getPaymentAttemptByOrderId(callbackData.merchantPaymInfo.reference);
      if (!paymentAttempt) {
        throw new Error('Payment attempt not found');
      }

      // Get package details for notification
      const packageDetails = await this.getPackageById(paymentAttempt.package_id!);
      if (!packageDetails) {
        throw new Error('Package not found');
      }

      // Get user email for notification
      const { data: userData } = await supabase
        .from('custom_users')
        .select('email')
        .eq('id', paymentAttempt.user_id)
        .single();

      // Assign package to user
      await this.assignPackageToUserWithDuration(
        paymentAttempt.user_id,
        paymentAttempt.package_id!,
        paymentAttempt.order_type === 'recurring' ? 1 : 12 // Monthly = 1 month, Yearly = 12 months
      );

      // Create recurring subscription if applicable
      let subscriptionId: string | undefined;
      if (paymentAttempt.order_type === 'recurring' && callbackData.paymentInfo?.token) {
        const subscription = await this.recurringService.createRecurringSubscription(
          paymentAttempt.user_id,
          paymentAttempt.package_id!,
          callbackData.invoiceId,
          callbackData.paymentInfo.token
        );
        subscriptionId = subscription.id;
      }

      // Update payment attempt with subscription ID
      await this.updatePaymentAttemptSubscriptionId(callbackData.merchantPaymInfo.reference, subscriptionId);

      // Update payment status to completed
      await this.updatePaymentAttemptStatus(callbackData.merchantPaymInfo.reference, callbackData, 'completed');

      // Send Telegram notification
      await this.telegramService.sendPaymentNotification(
        userData?.email || 'unknown@example.com',
        packageDetails.name,
        paymentAttempt.amount,
        paymentAttempt.currency
      );

      // Asynchronously get and store receipt
      this.storeReceiptAsync(callbackData.merchantPaymInfo.reference, callbackData.invoiceId, paymentAttempt.user_id);
    } catch (error) {
      console.error('Error handling successful payment:', error);
      
      // Send error notification to Telegram
      await this.telegramService.sendErrorNotification(
        error instanceof Error ? error.message : 'Unknown error',
        'handleSuccessfulPayment'
      );
    }
  }

  private async storeReceiptAsync(orderId: string, paymentId: string, userId: string): Promise<void> {
    try {
      const pdfBuffer = await this.monobankService.getReceipt(paymentId);
      await this.storeReceiptInDatabase(orderId, paymentId, userId, pdfBuffer);
    } catch (error) {
      console.error('Error storing receipt asynchronously:', error);
    }
  }

  private generateId(): string {
    // Generate proper UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateHTMLReceipt(paymentAttempt: PaymentAttempt): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${paymentAttempt.order_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .details { margin: 20px 0; }
          .details div { margin: 10px 0; }
          .footer { margin-top: 40px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment Receipt</h1>
        </div>
        <div class="details">
          <div><strong>Order ID:</strong> ${paymentAttempt.order_id}</div>
          <div><strong>Payment ID:</strong> ${paymentAttempt.payment_id}</div>
          <div><strong>Amount:</strong> ${paymentAttempt.amount} ${paymentAttempt.currency}</div>
          <div><strong>Status:</strong> ${paymentAttempt.status}</div>
          <div><strong>Date:</strong> ${paymentAttempt.created_at.toLocaleDateString()}</div>
        </div>
        <div class="footer">
          <p>Thank you for your payment!</p>
        </div>
      </body>
      </html>
    `;
  }

  // Database helper methods (these would be implemented with your actual database)
  private async getPackageById(packageId: string): Promise<Package | null> {
    console.log('Querying database for package:', packageId);
    
    // Query the subscription_plans table
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return null;
    }
    
    console.log('Database result:', data);
    
    // Transform to match Package interface
    if (data) {
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        price: data.price_monthly || data.price_yearly || 0,
        currency: data.currency || 'UAH',
        duration_months: data.price_yearly ? 12 : 1,
        features: data.features || [],
        is_active: data.is_active
      } as Package;
    }
    
    return null;
  }

  private async storePaymentAttempt(paymentAttempt: PaymentAttempt): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_attempts')
        .insert({
          id: paymentAttempt.id,
          user_id: paymentAttempt.user_id,
          package_id: paymentAttempt.package_id,
          order_id: paymentAttempt.order_id,
          payment_id: paymentAttempt.payment_id,
          checkout_id: paymentAttempt.checkout_id,
          checkout_url: paymentAttempt.checkout_url,
          amount: paymentAttempt.amount,
          currency: paymentAttempt.currency,
          billing_period: paymentAttempt.order_type === 'recurring' ? 'month' : 'year',
          status: paymentAttempt.status,
          payment_gateway: 'monobank',
          response_data: paymentAttempt.callback_data ? JSON.stringify(paymentAttempt.callback_data) : '{}',
          created_at: paymentAttempt.created_at.toISOString(),
          updated_at: paymentAttempt.updated_at.toISOString()
        });

      if (error) {
        console.error('Error storing payment attempt:', error);
        throw error;
      }

      console.log('Payment attempt stored successfully:', paymentAttempt.id);
    } catch (error) {
      console.error('Database error in storePaymentAttempt:', error);
      throw error;
    }
  }

  private async getPaymentAttemptByOrderId(orderId: string): Promise<PaymentAttempt | null> {
    try {
      const { data, error } = await supabase
        .from('payment_attempts')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error getting payment attempt:', error);
        throw error;
      }

      if (!data) {
        return null;
      }

      // Parse response_data if it's a string
      let callbackData = {};
      if (data.response_data && typeof data.response_data === 'string') {
        try {
          callbackData = JSON.parse(data.response_data);
        } catch (parseError) {
          console.error('Error parsing response_data:', parseError);
          callbackData = {};
        }
      } else if (data.response_data && typeof data.response_data === 'object') {
        callbackData = data.response_data;
      }

      // Transform to PaymentAttempt interface
      return {
        id: data.id,
        user_id: data.user_id,
        order_id: data.order_id,
        payment_id: data.payment_id,
        checkout_id: data.checkout_id,
        checkout_url: data.checkout_url,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        order_type: data.billing_period === 'month' ? 'recurring' : 'one-time',
        package_id: data.package_id,
        subscription_id: data.subscription_id,
        callback_data: callbackData,
        error_message: data.error_message,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      } as PaymentAttempt;
    } catch (error) {
      console.error('Database error in getPaymentAttemptByOrderId:', error);
      return null;
    }
  }

  private async updatePaymentAttemptStatus(orderId: string, data: any, status?: string): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Update status if provided
      if (status) {
        updateData.status = status;
      }

      // Store response data from LiqPay callback
      if (data) {
        const responseData = {
          payment_id: data.payment_id,
          status: data.status,
          transaction_id: data.transaction_id,
          result: data.result,
          response_code: data.response_code,
          rec_token: data.rec_token,
          payment_method: data.payment_method,
          card_type: data.card_type,
          sender_card_mask2: data.sender_card_mask2,
          create_date: data.create_date,
          end_date: data.end_date
        };
        updateData.response_data = JSON.stringify(responseData);
      }

      const { error } = await supabase
        .from('payment_attempts')
        .update(updateData)
        .eq('order_id', orderId);

      if (error) {
        console.error('Error updating payment attempt status:', error);
        throw error;
      }

      console.log('Payment attempt status updated successfully:', orderId);
    } catch (error) {
      console.error('Database error in updatePaymentAttemptStatus:', error);
      throw error;
    }
  }

  private async updatePaymentAttemptCheckoutUrl(orderId: string, checkoutUrl: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_attempts')
        .update({
          checkout_url: checkoutUrl,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (error) {
        console.error('Error updating checkout URL:', error);
        throw error;
      }

      console.log('Checkout URL updated successfully:', orderId);
    } catch (error) {
      console.error('Database error in updatePaymentAttemptCheckoutUrl:', error);
      throw error;
    }
  }

  private async updatePaymentAttemptSubscriptionId(orderId: string, subscriptionId?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_attempts')
        .update({
          subscription_id: subscriptionId,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (error) {
        console.error('Error updating subscription ID:', error);
        throw error;
      }

      console.log('Subscription ID updated successfully:', orderId);
    } catch (error) {
      console.error('Database error in updatePaymentAttemptSubscriptionId:', error);
      throw error;
    }
  }

  private async getUserSubscription(userId: string, packageId: string): Promise<any> {
    // Database implementation - get user's active subscription for this package
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('package_id', packageId)
        .eq('status', 'active')
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  private async assignPackageToUserWithDuration(userId: string, packageId: string, durationMonths: number): Promise<void> {
    try {
      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      // First, deactivate any existing active subscriptions for this user and package
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('package_id', packageId)
        .eq('status', 'active');

      // Create new subscription record
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          package_id: packageId,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: durationMonths === 1, // Auto-renew for monthly subscriptions
          created_at: startDate.toISOString(),
          updated_at: startDate.toISOString()
        });

      if (error) {
        console.error('Error assigning package to user:', error);
        throw error;
      }

      // Update user profile with subscription info
      const { data: packageData } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', packageId)
        .single();

      // Update user's subscription status in profiles table
      await supabase
        .from('custom_users')
        .update({
          subscription_status: 'active',
          subscription_plan: packageData?.name || 'Unknown',
          subscription_expires_at: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      console.log(`Package ${packageId} assigned to user ${userId} for ${durationMonths} months`);
    } catch (error) {
      console.error('Database error in assignPackageToUserWithDuration:', error);
      throw error;
    }
  }

  private async getReceiptFromDatabase(orderId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error getting receipt:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Database error in getReceiptFromDatabase:', error);
      return null;
    }
  }

  private async storeReceiptInDatabase(orderId: string, paymentId: string, userId: string, data: Buffer, type: 'pdf' | 'html' = 'pdf'): Promise<void> {
    try {
      const receiptData = {
        order_id: orderId,
        payment_id: paymentId,
        user_id: userId,
        pdf_data: type === 'pdf' ? data.toString('base64') : null,
        html_data: type === 'html' ? data.toString('utf8') : null,
        file_path: null, // Could store file path if saving to filesystem
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('receipts')
        .insert(receiptData);

      if (error) {
        console.error('Error storing receipt:', error);
        throw error;
      }

      console.log(`Receipt stored successfully for order: ${orderId}`);
    } catch (error) {
      console.error('Database error in storeReceiptInDatabase:', error);
      throw error;
    }
  }
}

export default PaymentController;
