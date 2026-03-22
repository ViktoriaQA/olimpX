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
  private resultUrl: string;
  private callbackUrl: string;

  constructor() {
    this.monobankService = new MonobankService();
    this.recurringService = new RecurringService();
    this.telegramService = new TelegramService();
    this.resultUrl = process.env.MONOBANK_RESULT_URL || '';
    this.callbackUrl = process.env.MONOBANK_CALLBACK_URL || '';
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

      // Store minimal payment attempt with unique token to prevent duplicates
      const paymentAttempt: PaymentAttempt = {
        id: this.generateId(),
        user_id: userId,
        order_id: orderId,
        payment_id: paymentResponse.payment_id,
        checkout_id: paymentResponse.payment_id,
        checkout_url: paymentResponse.checkout_url,
        amount: amount,
        currency: packageDetails.currency,
        status: 'initiated', // Use 'initiated' instead of 'pending'
        order_type: orderType,
        package_id: package_id,
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log('💾 [PAYMENT] Storing initiated payment attempt:', paymentAttempt);
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
      console.log('📋 [CALLBACK] Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('📋 [CALLBACK] Request body:', req.body);
      console.log('🌐 [CALLBACK] Request IP:', req.ip);
      console.log('⏰ [CALLBACK] Timestamp:', new Date().toISOString());

      // Parse and verify webhook data
      console.log('🔍 [CALLBACK] Parsing Monobank webhook data...');
      const callbackData = this.monobankService.parseWebhookData(req.body);
      console.log('✅ [CALLBACK] Parsed callback data:', JSON.stringify(callbackData, null, 2));
      console.log('💰 [CALLBACK] Payment amount:', callbackData.amount / 100, 'UAH');
      console.log('📄 [CALLBACK] Invoice ID:', callbackData.invoiceId);
      console.log('🆔 [CALLBACK] Order reference:', callbackData.merchantPaymInfo.reference);
      console.log('📊 [CALLBACK] Payment status:', callbackData.status);

      // Update payment attempt status using invoiceId as order_id
      console.log('📝 [CALLBACK] Updating payment attempt status...');
      await this.updatePaymentAttemptStatus(callbackData.merchantPaymInfo.reference, callbackData);
      console.log('✅ [CALLBACK] Payment attempt status updated');

      // Check if payment is successful
      const mappedStatus = this.monobankService.mapMonobankStatus(callbackData.status);
      console.log('📊 [CALLBACK] Mapped status:', mappedStatus);
      console.log('🎯 [CALLBACK] Is payment successful?', mappedStatus === 'completed');

      // Update status to completed if payment is successful
      if (mappedStatus === 'completed') {
        console.log('🎉 [CALLBACK] Payment completed successfully!');
        console.log('🔄 [CALLBACK] Processing successful payment...');
        await this.updatePaymentAttemptStatus(callbackData.merchantPaymInfo.reference, callbackData, 'completed');
        console.log('📦 [CALLBACK] Handling successful payment...');
        await this.handleSuccessfulPayment(callbackData);
        console.log('✅ [CALLBACK] Successful payment handling completed');
      } else {
        console.log('⏳ [CALLBACK] Payment not completed, status:', mappedStatus);
      }

      console.log('✅ [CALLBACK] Callback processed successfully');
      res.status(200).send('OK');
    } catch (error) {
      console.error('💥 [CALLBACK] Error handling payment callback:', error);
      console.error('💥 [CALLBACK] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('💥 [CALLBACK] Request body that caused error:', req.body);
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
          const mappedStatus = this.monobankService.mapMonobankStatus(invoiceStatus.status || 'created');
          
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
          const mappedStatus = this.monobankService.mapMonobankStatus(invoiceStatus.status || 'created');
          
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
      console.log('👤 [VERIFY] User ID:', req.user?.id);
      console.log('📧 [VERIFY] User email:', req.user?.email);
      console.log('⏰ [VERIFY] Verification timestamp:', new Date().toISOString());
      
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
        console.log('❌ [VERIFY] Payment attempt not found for order_id:', session_id);
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      console.log('✅ [VERIFY] Found payment attempt:', JSON.stringify(paymentAttempt, null, 2));
      console.log('💰 [VERIFY] Payment amount:', paymentAttempt.amount, paymentAttempt.currency);
      console.log('📦 [VERIFY] Package ID:', paymentAttempt.package_id);
      console.log('📊 [VERIFY] Current status:', paymentAttempt.status);

      if (paymentAttempt.user_id !== userId) {
        console.log('❌ [VERIFY] Access denied - user mismatch');
        console.log('❌ [VERIFY] Expected user_id:', userId, 'Found user_id:', paymentAttempt.user_id);
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Check real-time payment status
      try {
        console.log('🔄 [VERIFY] Checking real-time payment status...');
        console.log('💳 [VERIFY] Payment ID:', paymentAttempt.payment_id);
        const invoiceStatus = await this.monobankService.getInvoiceStatus(paymentAttempt.payment_id);
        console.log('📊 [VERIFY] Monobank status:', JSON.stringify(invoiceStatus, null, 2));
        const mappedStatus = this.monobankService.mapMonobankStatus(invoiceStatus.status || 'created');
        
        console.log('� [VERIFY] Mapped status:', mappedStatus);
        console.log('� [VERIFY] Updating payment attempt in database...');
        
        await this.updatePaymentAttemptStatus(session_id, invoiceStatus, mappedStatus);
        paymentAttempt.status = mappedStatus;
        console.log('✅ [VERIFY] Payment status updated to:', mappedStatus);
      } catch (error) {
        console.error('❌ [VERIFY] Error checking payment status:', error);
        console.error('❌ [VERIFY] Error details:', error instanceof Error ? error.message : 'Unknown error');
      }

      // Only proceed if payment is completed
      if (paymentAttempt.status !== 'completed') {
        console.log('⏳ [VERIFY] Payment not completed, current status:', paymentAttempt.status);
        console.log('⏳ [VERIFY] User will need to try again or contact support');
        res.status(400).json({ 
          error: 'Payment not completed',
          status: paymentAttempt.status,
          details: `Payment status is ${paymentAttempt.status}, expected 'completed'`
        });
        return;
      }

      console.log('🎉 [VERIFY] Payment completed successfully!');
      console.log('🔄 [VERIFY] Starting subscription activation process...');

      // Update user profile with subscription info
      console.log('📝 [VERIFY] Updating user subscription profile...');
      const durationMonths = paymentAttempt.order_type === 'recurring' ? 1 : 12;
      console.log('⏰ [VERIFY] Subscription duration:', durationMonths, 'months');
      
      await this.assignPackageToUserWithDuration(
        userId,
        paymentAttempt.package_id!,
        durationMonths
      );
      console.log('✅ [VERIFY] User subscription profile updated');

      // Get package details
      console.log('📦 [VERIFY] Getting package details...');
      const packageDetails = await this.getPackageById(paymentAttempt.package_id!);
      if (!packageDetails) {
        console.log('❌ [VERIFY] Package not found:', paymentAttempt.package_id);
        res.status(404).json({ error: 'Package not found' });
        return;
      }

      console.log('✅ [VERIFY] Package details:', JSON.stringify(packageDetails, null, 2));

      // Get user's subscription details
      console.log('👥 [VERIFY] Getting user subscription details...');
      const subscription = await this.getUserSubscription(userId, paymentAttempt.package_id!);
      console.log('📋 [VERIFY] User subscription:', JSON.stringify(subscription, null, 2));

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
          payment_method: 'Monobank',
          auto_renewal: true, // Subscriptions always have auto-renewal enabled
        }
      };

      console.log('🎯 [VERIFY] Returning response:', JSON.stringify(response, null, 2));
      console.log('✅ [VERIFY] Subscription verification completed successfully');
      res.json(response);
    } catch (error) {
      console.error('💥 [VERIFY] Error verifying subscription:', error);
      console.error('💥 [VERIFY] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('💥 [VERIFY] Request data:', { body: req.body, user: req.user?.id });
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

  async initiateRecurringSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🔄 [RECURRING_PAYMENT] Initiating recurring subscription payment...');
      console.log('📋 [RECURRING_PAYMENT] Request body:', req.body);
      console.log('👤 [RECURRING_PAYMENT] User ID:', req.user?.id);
      console.log('📧 [RECURRING_PAYMENT] User email:', req.user?.email);
      
      const userId = req.user?.id;
      if (!userId) {
        console.log('❌ [RECURRING_PAYMENT] Unauthorized - no user ID');
        res.status(401).json({ 
          error: 'Unauthorized',
          details: 'User authentication required'
        });
        return;
      }

      const { package_id, billing_cycle }: InitiateSubscriptionRequest = req.body;
      console.log('📦 [RECURRING_PAYMENT] Package ID:', package_id, 'Billing cycle:', billing_cycle);

      // Validate request
      if (!package_id || !billing_cycle) {
        console.log('❌ [RECURRING_PAYMENT] Missing required fields');
        res.status(400).json({ 
          error: 'Missing required fields',
          details: 'package_id and billing_cycle are required',
          required: ['package_id', 'billing_cycle']
        });
        return;
      }

      // Validate billing cycle
      if (!['monthly', 'yearly'].includes(billing_cycle)) {
        console.log('❌ [RECURRING_PAYMENT] Invalid billing cycle:', billing_cycle);
        res.status(400).json({ 
          error: 'Invalid billing cycle',
          details: 'billing_cycle must be either "monthly" or "yearly"',
          received: billing_cycle
        });
        return;
      }

      // Get package details
      console.log('🔍 [RECURRING_PAYMENT] Looking for package with ID:', package_id);
      const packageDetails = await this.getPackageById(package_id);
      console.log('✅ [RECURRING_PAYMENT] Found package:', packageDetails);
      
      if (!packageDetails) {
        console.error('❌ [RECURRING_PAYMENT] Package not found with ID:', package_id);
        res.status(404).json({ 
          error: 'Package not found',
          details: `No package found with ID: ${package_id}`
        });
        return;
      }

      // Check if package is active
      if (!packageDetails.is_active) {
        console.log('❌ [RECURRING_PAYMENT] Package is not active:', package_id);
        res.status(400).json({ 
          error: 'Package not available',
          details: 'This package is currently not available for subscription'
        });
        return;
      }

      // Calculate amount based on billing cycle
      let amount = packageDetails.price;
      let interval: string;
      
      if (billing_cycle === 'yearly') {
        amount = packageDetails.price * 11; // 11 months for yearly (1 month free)
        interval = '1y'; // 1 year
        console.log('💰 [RECURRING_PAYMENT] Yearly billing - calculated amount:', amount);
      } else {
        interval = '1m'; // 1 month
        console.log('💰 [RECURRING_PAYMENT] Monthly billing - amount:', amount);
      }

      // Validate amount
      if (amount <= 0) {
        console.log('❌ [RECURRING_PAYMENT] Invalid amount:', amount);
        res.status(400).json({ 
          error: 'Invalid amount',
          details: 'Package price must be greater than 0'
        });
        return;
      }

      // Convert to kopecks
      const amountInKopecks = Math.round(amount * 100);
      console.log('💰 [RECURRING_PAYMENT] Amount in kopecks:', amountInKopecks);

      // Generate order ID
      const orderId = `recurring_${userId}_${Date.now()}`;
      console.log('🆔 [RECURRING_PAYMENT] Generated order ID:', orderId);

      // Validate environment variables
      if (!this.resultUrl || !this.callbackUrl) {
        console.error('❌ [RECURRING_PAYMENT] Missing environment variables');
        res.status(500).json({ 
          error: 'Server configuration error',
          details: 'Missing MONOBANK_RESULT_URL or MONOBANK_CALLBACK_URL'
        });
        return;
      }

      // Create recurring subscription request
      const subscriptionRequest = {
        amount: amountInKopecks,
        ccy: 980, // UAH
        redirectUrl: `${this.resultUrl}?order_id=${orderId}&type=recurring`,
        webHookUrls: {
          chargeUrl: `${this.callbackUrl}/charge`,
          statusUrl: `${this.callbackUrl}/status`
        },
        interval: interval,
        validity: 3600 // 1 hour
      };

      console.log('💳 [RECURRING_PAYMENT] Creating recurring subscription with Monobank...');
      console.log('📝 [RECURRING_PAYMENT] Subscription request:', JSON.stringify(subscriptionRequest, null, 2));

      // Create recurring subscription with Monobank
      const subscriptionResponse = await this.monobankService.createSubscription(subscriptionRequest);
      console.log('✅ [RECURRING_PAYMENT] Monobank response:', subscriptionResponse);

      // Store recurring payment attempt
      const paymentAttempt: PaymentAttempt = {
        id: this.generateId(),
        user_id: userId,
        order_id: orderId,
        payment_id: subscriptionResponse.subscriptionId,
        checkout_id: subscriptionResponse.subscriptionId,
        checkout_url: subscriptionResponse.pageUrl,
        amount: amount,
        currency: 'UAH',
        status: 'initiated',
        order_type: 'recurring',
        package_id: package_id,
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log('💾 [RECURRING_PAYMENT] Storing recurring payment attempt:', paymentAttempt);
      await this.storePaymentAttempt(paymentAttempt);
      console.log('✅ [RECURRING_PAYMENT] Recurring payment attempt stored successfully');

      // Return response
      const response = {
        checkout_url: subscriptionResponse.pageUrl,
        order_id: orderId,
        subscription_id: subscriptionResponse.subscriptionId,
        interval: interval,
        amount: amount,
        billing_cycle: billing_cycle,
        package_name: packageDetails.name
      };

      console.log('🎯 [RECURRING_PAYMENT] Returning response:', response);
      res.status(200).json(response);
    } catch (error) {
      console.error('💥 [RECURRING_PAYMENT] Error initiating recurring subscription payment:', error);
      
      // Return appropriate error message
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      console.log('📝 [RECURRING_PAYMENT] Error message:', errorMessage);
      
      // Determine status code based on error type
      let statusCode = 500;
      if (errorMessage.includes('не знайдено') || errorMessage.includes('не знайдено')) {
        statusCode = 404;
      } else if (errorMessage.includes('некоректний') || errorMessage.includes('невалідний')) {
        statusCode = 400;
      } else if (errorMessage.includes('токен') || errorMessage.includes('доступ')) {
        statusCode = 403;
      }
      
      res.status(statusCode).json({ 
        error: 'Recurring subscription payment initiation failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleRecurringChargeCallback(req: Request, res: Response): Promise<void> {
    try {
      console.log('💳 [RECURRING_CHARGE] Received recurring charge callback...');
      console.log('📋 [RECURRING_CHARGE] Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('📋 [RECURRING_CHARGE] Request body:', req.body);
      console.log('🌐 [RECURRING_CHARGE] Request IP:', req.ip);
      console.log('⏰ [RECURRING_CHARGE] Timestamp:', new Date().toISOString());

      // Parse and verify webhook data
      console.log('🔍 [RECURRING_CHARGE] Parsing webhook data...');
      const callbackData = this.monobankService.parseWebhookData(req.body);
      console.log('✅ [RECURRING_CHARGE] Parsed callback data:', JSON.stringify(callbackData, null, 2));
      console.log('💰 [RECURRING_CHARGE] Charge amount:', callbackData.amount / 100, 'UAH');
      console.log('📄 [RECURRING_CHARGE] Invoice ID:', callbackData.invoiceId);
      console.log('🆔 [RECURRING_CHARGE] Order reference:', callbackData.merchantPaymInfo.reference);
      console.log('📊 [RECURRING_CHARGE] Payment status:', callbackData.status);

      // Find the payment attempt
      console.log('🔎 [RECURRING_CHARGE] Looking for payment attempt...');
      const paymentAttempt = await this.getPaymentAttemptByOrderId(callbackData.merchantPaymInfo.reference);
      if (!paymentAttempt) {
        console.error('❌ [RECURRING_CHARGE] Payment attempt not found for order:', callbackData.merchantPaymInfo.reference);
        res.status(404).json({ error: 'Payment attempt not found' });
        return;
      }

      console.log('✅ [RECURRING_CHARGE] Found payment attempt:', paymentAttempt.id);
      console.log('👤 [RECURRING_CHARGE] User ID:', paymentAttempt.user_id);
      console.log('📦 [RECURRING_CHARGE] Package ID:', paymentAttempt.package_id);

      // Update payment attempt status
      console.log('📝 [RECURRING_CHARGE] Updating payment attempt status...');
      await this.updatePaymentAttemptStatus(paymentAttempt.order_id, callbackData);
      console.log('✅ [RECURRING_CHARGE] Payment attempt status updated');

      // Check if payment is successful
      const mappedStatus = this.monobankService.mapMonobankStatus(callbackData.status);
      console.log('📊 [RECURRING_CHARGE] Mapped status:', mappedStatus);
      console.log('🎯 [RECURRING_CHARGE] Is charge successful?', mappedStatus === 'completed');

      if (mappedStatus === 'completed') {
        console.log('🎉 [RECURRING_CHARGE] Recurring charge successful!');
        console.log('🔄 [RECURRING_CHARGE] Extending subscription...');
        
        // Extend subscription by one billing cycle
        const durationMonths = paymentAttempt.order_type === 'recurring' ? 1 : 12;
        await this.assignPackageToUserWithDuration(
          paymentAttempt.user_id,
          paymentAttempt.package_id!,
          durationMonths
        );
        
        console.log('✅ [RECURRING_CHARGE] Subscription extended successfully');
        
        // Send notification to user
        try {
          await this.telegramService.sendSubscriptionCancellationNotification(
            paymentAttempt.user_id,
            'Subscription renewed successfully'
          );
          console.log('📢 [RECURRING_CHARGE] Renewal notification sent');
        } catch (notificationError) {
          console.error('❌ [RECURRING_CHARGE] Failed to send renewal notification:', notificationError);
        }
      } else {
        console.log('❌ [RECURRING_CHARGE] Recurring charge failed, status:', mappedStatus);
        
        // Handle failed renewal
        await this.recurringService.handleFailedRenewal(
          paymentAttempt.order_id,
          `Payment failed with status: ${mappedStatus}`
        );
        
        console.log('🔄 [RECURRING_CHARGE] Failed renewal handled');
      }

      console.log('✅ [RECURRING_CHARGE] Callback processed successfully');
      res.status(200).send('OK');
    } catch (error) {
      console.error('💥 [RECURRING_CHARGE] Error handling recurring charge callback:', error);
      console.error('💥 [RECURRING_CHARGE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('💥 [RECURRING_CHARGE] Request body that caused error:', req.body);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleRecurringStatusCallback(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 [RECURRING_STATUS] Received recurring status callback...');
      console.log('📋 [RECURRING_STATUS] Request body:', req.body);
      console.log('⏰ [RECURRING_STATUS] Timestamp:', new Date().toISOString());

      // Parse and verify webhook data
      console.log('🔍 [RECURRING_STATUS] Parsing webhook data...');
      const callbackData = this.monobankService.parseWebhookData(req.body);
      console.log('✅ [RECURRING_STATUS] Parsed callback data:', JSON.stringify(callbackData, null, 2));

      // Find the payment attempt
      console.log('🔎 [RECURRING_STATUS] Looking for payment attempt...');
      const paymentAttempt = await this.getPaymentAttemptByOrderId(callbackData.merchantPaymInfo.reference);
      if (!paymentAttempt) {
        console.error('❌ [RECURRING_STATUS] Payment attempt not found for order:', callbackData.merchantPaymInfo.reference);
        res.status(404).json({ error: 'Payment attempt not found' });
        return;
      }

      // Update payment attempt status
      console.log('📝 [RECURRING_STATUS] Updating payment attempt status...');
      await this.updatePaymentAttemptStatus(paymentAttempt.order_id, callbackData);
      console.log('✅ [RECURRING_STATUS] Payment attempt status updated');

      console.log('✅ [RECURRING_STATUS] Status callback processed successfully');
      res.status(200).send('OK');
    } catch (error) {
      console.error('💥 [RECURRING_STATUS] Error handling recurring status callback:', error);
      console.error('💥 [RECURRING_STATUS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async cancelSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🚫 [CANCEL] Cancelling subscription...');
      console.log('📋 [CANCEL] Request params:', req.params);
      console.log('👤 [CANCEL] User ID:', req.user?.id);
      
      const { subscriptionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        console.log('❌ [CANCEL] Unauthorized - no user ID');
        res.status(401).json({ 
          error: 'Unauthorized',
          details: 'User authentication required'
        });
        return;
      }

      console.log('🆔 [CANCEL] Subscription ID:', subscriptionId);
      console.log('🔄 [CANCEL] Cancelling with RecurringService...');

      const success = await this.recurringService.cancelRecurringSubscription(subscriptionId, userId);
      
      if (success) {
        console.log('✅ [CANCEL] Subscription cancelled successfully');
        res.json({ 
          message: 'Subscription cancelled successfully',
          subscription_id: subscriptionId,
          cancelled_at: new Date().toISOString()
        });
      } else {
        console.log('❌ [CANCEL] Failed to cancel subscription');
        res.status(400).json({ 
          error: 'Failed to cancel subscription',
          details: 'Subscription may not exist or you may not have permission to cancel it'
        });
      }
    } catch (error) {
      console.error('💥 [CANCEL] Error cancelling subscription:', error);
      console.error('💥 [CANCEL] Error details:', {
        subscriptionId: req.params.subscriptionId,
        userId: req.user?.id,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      res.status(500).json({ 
        error: 'Internal server error',
        details: 'An error occurred while cancelling the subscription'
      });
    }
  }

  async checkPaymentStatusWithMonobank(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🔍 [MONOBANK_CHECK] Checking payment status with Monobank...');
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        console.log('❌ [MONOBANK_CHECK] Unauthorized');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      console.log('🆔 [MONOBANK_CHECK] Order ID:', orderId);

      // Get payment attempt to retrieve payment_id
      const paymentAttempt = await this.getPaymentAttemptByOrderId(orderId);
      if (!paymentAttempt) {
        console.log('❌ [MONOBANK_CHECK] Payment attempt not found');
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      if (paymentAttempt.user_id !== userId) {
        console.log('❌ [MONOBANK_CHECK] Access denied - user mismatch');
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Check payment status directly with Monobank using payment_id
      const invoiceStatus = await this.monobankService.getInvoiceStatus(paymentAttempt.payment_id);
      console.log('📊 [MONOBANK_CHECK] Monobank status:', invoiceStatus);

      // Map Monobank status to our status
      const mappedStatus = this.monobankService.mapMonobankStatus(invoiceStatus.status || 'created');

      console.log('📈 [MONOBANK_CHECK] Mapped status:', mappedStatus);

      // Update payment attempt in our database
      await this.updatePaymentAttemptStatus(orderId, invoiceStatus, mappedStatus);

      res.json({
        success: true,
        status: mappedStatus,
        monobankStatus: invoiceStatus.status
      });
    } catch (error) {
      console.error('💥 [MONOBANK_CHECK] Error checking payment status:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to check payment status' 
      });
    }
  }

  private async handleSuccessfulPayment(callbackData: MonobankCallbackData): Promise<void> {
    try {
      const orderId = callbackData.merchantPaymInfo.reference;
      const paymentId = callbackData.invoiceId;
      
      console.log('🔍 [SUCCESS] Processing successful payment:', { orderId, paymentId });
      console.log('💰 [SUCCESS] Payment amount:', callbackData.amount / 100, 'UAH');
      console.log('💳 [SUCCESS] Payment method:', callbackData.paymentMethod);
      console.log('📄 [SUCCESS] Invoice ID:', callbackData.invoiceId);
      console.log('⏰ [SUCCESS] Payment timestamp:', new Date(callbackData.timestamp * 1000).toISOString());

      // Check if payment attempt already exists
      const existingAttempt = await this.getPaymentAttemptByOrderId(orderId);
      if (existingAttempt) {
        console.log('⚠️ [SUCCESS] Payment attempt already exists, updating status...');
        console.log('📝 [SUCCESS] Current attempt status:', existingAttempt.status);
        console.log('👤 [SUCCESS] User ID:', existingAttempt.user_id);
        console.log('📦 [SUCCESS] Package ID:', existingAttempt.package_id);
        
        await this.updatePaymentAttemptStatus(orderId, callbackData, 'completed');
        console.log('✅ [SUCCESS] Payment attempt status updated to completed');
        
        // Activate subscription if we have user and package info
        if (existingAttempt.user_id && existingAttempt.package_id) {
          console.log('🔄 [SUCCESS] Activating subscription for user:', existingAttempt.user_id);
          const durationMonths = existingAttempt.order_type === 'recurring' ? 1 : 12;
          console.log('⏰ [SUCCESS] Subscription duration:', durationMonths, 'months');
          
          const subscriptionId = await this.assignPackageToUserWithDuration(
            existingAttempt.user_id,
            existingAttempt.package_id,
            durationMonths
          );
          console.log('✅ [SUCCESS] Subscription activated successfully');
          
          // Create recurring subscription record for auto-renewal
          if (existingAttempt.order_type === 'recurring' && callbackData.paymentInfo?.token) {
            console.log('🔄 [SUCCESS] Setting up auto-renewal with token...');
            await this.createRecurringSubscriptionRecord(
              existingAttempt.user_id,
              existingAttempt.package_id,
              subscriptionId,
              paymentId,
              callbackData.paymentInfo.token,
              existingAttempt.amount,
              durationMonths === 1 ? 'month' : 'year'
            );
            console.log('✅ [SUCCESS] Auto-renewal setup completed');
          } else {
            console.log('⚠️ [SUCCESS] No recurring token available, auto-renewal not set up');
            console.log('🔍 [SUCCESS] PaymentInfo token:', callbackData.paymentInfo?.token);
            console.log('🔍 [SUCCESS] Order type:', existingAttempt.order_type);
          }
        } else {
          console.log('⚠️ [SUCCESS] Missing user_id or package_id, cannot auto-activate subscription');
        }
      } else {
        console.log('📝 [SUCCESS] Creating new payment attempt record...');
        
        // Extract package info from order_id format: sub_userId_timestamp
        // We need to store package_id in order_id or find another way
        // For now, let's create a basic record
        const newPaymentAttempt: PaymentAttempt = {
          id: this.generateId(),
          user_id: 'unknown', // TODO: Extract from callback
          order_id: orderId,
          payment_id: paymentId,
          checkout_id: paymentId,
          checkout_url: '',
          amount: callbackData.amount / 100,
          currency: 'UAH',
          status: 'completed',
          order_type: 'recurring',
          package_id: 'unknown', // TODO: Extract from order or callback
          created_at: new Date(),
          updated_at: new Date(),
        };

        await this.storePaymentAttempt(newPaymentAttempt);
        console.log('✅ [SUCCESS] Payment attempt record created');
        console.log('⚠️ [SUCCESS] Cannot auto-activate subscription due to missing user/package info');
      }

      console.log('🎉 [SUCCESS] Successful payment processing completed');
      
    } catch (error) {
      console.error('💥 [SUCCESS] Error handling successful payment:', error);
      console.error('💥 [SUCCESS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('💥 [SUCCESS] Callback data:', JSON.stringify(callbackData, null, 2));
      
      // Send error notification to Telegram
      try {
        await this.telegramService.sendErrorNotification(
          error instanceof Error ? error.message : 'Unknown error',
          'handleSuccessfulPayment'
        );
        console.log('📢 [SUCCESS] Error notification sent to Telegram');
      } catch (telegramError) {
        console.error('💥 [SUCCESS] Failed to send Telegram notification:', telegramError);
      }
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
        console.log(`📝 [PAYMENT] Updating payment attempt ${orderId} status to: ${status}`);
      }

      // Store response data from payment gateway callback
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

  private async assignPackageToUserWithDuration(userId: string, packageId: string, durationMonths: number): Promise<string> {
    try {
      console.log('🎯 [ASSIGN] Assigning package to user:', { userId, packageId, durationMonths });
      
      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationMonths);
      
      console.log('📅 [ASSIGN] Subscription period:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        duration: durationMonths + ' months'
      });

      // First, deactivate any existing active subscriptions for this user and package
      console.log('🔄 [ASSIGN] Deactivating existing subscriptions...');
      const { data: existingSubs, error: deactivateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('package_id', packageId)
        .eq('status', 'active')
        .select();
        
      if (deactivateError) {
        console.error('❌ [ASSIGN] Error deactivating existing subscriptions:', deactivateError);
      } else {
        console.log('✅ [ASSIGN] Existing subscriptions deactivated:', existingSubs?.length || 0);
      }

      // Create new subscription record
      console.log('📝 [ASSIGN] Creating new subscription record...');
      const { data: newSubscription, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          package_id: packageId,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          created_at: startDate.toISOString(),
          updated_at: startDate.toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [ASSIGN] Error creating subscription:', insertError);
        throw insertError;
      }
      
      console.log('✅ [ASSIGN] New subscription created:', JSON.stringify(newSubscription, null, 2));

      // Update user profile with subscription info
      console.log('👤 [ASSIGN] Updating user profile...');
      const { data: packageData, error: packageError } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', packageId)
        .single();
        
      if (packageError) {
        console.error('❌ [ASSIGN] Error fetching package data:', packageError);
      } else {
        console.log('📦 [ASSIGN] Package data:', packageData);
      }

      // Update user's subscription status in profiles table
      console.log('🔄 [ASSIGN] Updating custom_users table...');
      const { data: updateResult, error: updateError } = await supabase
        .from('custom_users')
        .update({
          subscription_status: 'active',
          subscription_plan: packageData?.name || 'Unknown',
          subscription_expires_at: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error('❌ [ASSIGN] Error updating user subscription status:', updateError);
      } else {
        console.log('✅ [ASSIGN] User profile updated successfully:', JSON.stringify(updateResult, null, 2));
        console.log(`✅ [ASSIGN] Updated user ${userId} subscription: status=active, plan=${packageData?.name}, expires=${endDate.toISOString()}`);
      }

      console.log(`🎉 [ASSIGN] Package ${packageId} assigned to user ${userId} for ${durationMonths} months`);
      console.log('🎯 [ASSIGN] Package assignment process completed successfully');
      
      // Return the subscription ID
      return newSubscription.id;
      
    } catch (error) {
      console.error('💥 [ASSIGN] Database error in assignPackageToUserWithDuration:', error);
      console.error('💥 [ASSIGN] Error details:', { userId, packageId, durationMonths, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private async createRecurringSubscriptionRecord(
    userId: string,
    packageId: string,
    subscriptionId: string,
    paymentId: string,
    recToken: string,
    amount: number,
    billingPeriod: 'month' | 'year'
  ): Promise<void> {
    try {
      console.log('🔄 [RECURRING] Creating recurring subscription record...');
      console.log('👤 [RECURRING] User ID:', userId);
      console.log('📦 [RECURRING] Package ID:', packageId);
      console.log('🆔 [RECURRING] Subscription ID:', subscriptionId);
      console.log('💳 [RECURRING] Payment ID:', paymentId);
      console.log('🔑 [RECURRING] Token length:', recToken.length);
      console.log('💰 [RECURRING] Amount:', amount);
      console.log('⏰ [RECURRING] Billing period:', billingPeriod);

      // Calculate next payment date
      const lastPaymentDate = new Date();
      const nextPaymentDate = new Date(lastPaymentDate);
      
      if (billingPeriod === 'month') {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else {
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
      }

      console.log('📅 [RECURRING] Payment dates:', {
        last: lastPaymentDate.toISOString(),
        next: nextPaymentDate.toISOString()
      });

      // Create recurring subscription record
      const { data: recurringSub, error: insertError } = await supabase
        .from('recurring_subscriptions')
        .insert({
          id: `rec_${userId}_${Date.now()}`,
          user_id: userId,
          package_id: packageId,
          subscription_id: subscriptionId,
          payment_id: paymentId,
          rec_token: recToken,
          status: 'active',
          billing_period: billingPeriod,
          amount: amount,
          currency: 'UAH',
          last_payment_date: lastPaymentDate.toISOString(),
          next_payment_date: nextPaymentDate.toISOString(),
          failed_attempts: 0,
          is_active: true,
          created_at: lastPaymentDate.toISOString(),
          updated_at: lastPaymentDate.toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [RECURRING] Error creating recurring subscription:', insertError);
        throw insertError;
      }

      console.log('✅ [RECURRING] Recurring subscription created successfully:', JSON.stringify(recurringSub, null, 2));
      console.log('🎉 [RECURRING] Auto-renewal setup completed for user:', userId);
      
    } catch (error) {
      console.error('💥 [RECURRING] Error creating recurring subscription record:', error);
      console.error('💥 [RECURRING] Error details:', {
        userId,
        packageId,
        subscriptionId,
        paymentId,
        amount,
        billingPeriod,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error here - auto-renewal setup failure shouldn't break the main payment flow
      console.log('⚠️ [RECURRING] Auto-renewal setup failed, but payment was successful');
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
