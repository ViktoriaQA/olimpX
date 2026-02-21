import { Request, Response } from 'express';
import LiqPayService from '../services/liqpayService';
import RecurringService from '../services/recurringService';
import { AuthenticatedRequest } from '../types/auth';
import { 
  InitiateSubscriptionRequest, 
  InitiateSubscriptionResponse,
  PaymentStatusResponse,
  LiqPayCallbackData,
  PaymentAttempt,
  Package,
  Subscription
} from '../models/subscription';

export class PaymentController {
  private liqPayService: LiqPayService;
  private recurringService: RecurringService;

  constructor() {
    this.liqPayService = new LiqPayService();
    this.recurringService = new RecurringService();
  }

  async initiateSubscriptionPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { package_id, billing_cycle }: InitiateSubscriptionRequest = req.body;

      // Validate request
      if (!package_id || !billing_cycle) {
        res.status(400).json({ error: 'package_id and billing_cycle are required' });
        return;
      }

      // Get package details
      const packageDetails = await this.getPackageById(package_id);
      if (!packageDetails) {
        res.status(404).json({ error: 'Package not found' });
        return;
      }

      // Calculate amount based on billing cycle
      let amount = packageDetails.price;
      let orderType: 'one-time' | 'recurring' = 'recurring';
      
      if (billing_cycle === 'yearly') {
        amount = packageDetails.price * 11; // 11 months for yearly (1 month free)
        orderType = 'one-time';
      }

      // Generate order ID
      const orderId = `sub_${userId}_${Date.now()}`;

      // Create payment request
      const paymentRequest = {
        order_id: orderId,
        amount: amount,
        currency: packageDetails.currency,
        description: `Підписка на ${packageDetails.name} - ${billing_cycle === 'monthly' ? 'щомісячна' : 'річна'}`,
        order_type: orderType,
        customer: userId,
        email: req.user?.email,
        phone: req.user?.phone,
        product_name: packageDetails.name,
        product_description: packageDetails.description,
        product_price: amount,
      };

      // Create payment with LiqPay
      const paymentResponse = await this.liqPayService.createPaymentURL(paymentRequest);

      // Store payment attempt
      const paymentAttempt: PaymentAttempt = {
        id: this.generateId(),
        user_id: userId,
        order_id: orderId,
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

      await this.storePaymentAttempt(paymentAttempt);

      // Return response
      const response: InitiateSubscriptionResponse = {
        checkout_url: paymentResponse.checkout_url,
        order_id: orderId,
        payment_id: paymentResponse.payment_id,
      };

      res.json(response);
    } catch (error) {
      console.error('Error initiating subscription payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handlePaymentCallback(req: Request, res: Response): Promise<void> {
    try {
      const { data, signature } = req.body;

      if (!data || !signature) {
        res.status(400).json({ error: 'data and signature are required' });
        return;
      }

      // Parse and verify callback
      const callbackData = await this.liqPayService.parseCallback(data, signature);

      // Update payment attempt status
      await this.updatePaymentAttemptStatus(callbackData.order_id, callbackData);

      // Get real checkout URL if needed
      if (callbackData.status === 'processing') {
        try {
          const paymentStatus = await this.liqPayService.checkPaymentStatus(callbackData.order_id);
          if (paymentStatus.checkout_url) {
            await this.updatePaymentAttemptCheckoutUrl(callbackData.order_id, paymentStatus.checkout_url);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }

      // Check if payment is successful
      const mappedStatus = this.liqPayService.mapLiqPayStatusWithResult(
        callbackData.status,
        callbackData.result,
        callbackData.response_code
      );

      if (mappedStatus === 'completed') {
        await this.handleSuccessfulPayment(callbackData);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Error handling payment callback:', error);
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
          const paymentStatus = await this.liqPayService.checkPaymentStatus(orderId);
          const mappedStatus = this.liqPayService.mapLiqPayStatusWithResult(
            paymentStatus.status,
            paymentStatus.result,
            paymentStatus.response_code
          );
          
          await this.updatePaymentAttemptStatus(orderId, paymentStatus);
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
          const paymentStatus = await this.liqPayService.checkPaymentStatus(orderId);
          const mappedStatus = this.liqPayService.mapLiqPayStatusWithResult(
            paymentStatus.status,
            paymentStatus.result,
            paymentStatus.response_code
          );
          
          await this.updatePaymentAttemptStatus(orderId, paymentStatus);
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
          // Get PDF from LiqPay
          const pdfBuffer = await this.liqPayService.getReceiptPDF(orderId, paymentAttempt.payment_id);
          
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

  private async handleSuccessfulPayment(callbackData: LiqPayCallbackData): Promise<void> {
    try {
      const paymentAttempt = await this.getPaymentAttemptByOrderId(callbackData.order_id);
      if (!paymentAttempt) {
        throw new Error('Payment attempt not found');
      }

      // Assign package to user
      await this.assignPackageToUserWithDuration(
        paymentAttempt.user_id,
        paymentAttempt.package_id!,
        paymentAttempt.order_type === 'recurring' ? 1 : 12 // Monthly = 1 month, Yearly = 12 months
      );

      // Create recurring subscription if applicable
      let subscriptionId: string | undefined;
      if (paymentAttempt.order_type === 'recurring' && callbackData.rec_token) {
        const subscription = await this.recurringService.createRecurringSubscription(
          paymentAttempt.user_id,
          paymentAttempt.package_id!,
          callbackData.payment_id,
          callbackData.rec_token
        );
        subscriptionId = subscription.id;
      }

      // Update payment attempt with subscription ID
      await this.updatePaymentAttemptSubscriptionId(callbackData.order_id, subscriptionId);

      // Update payment status to completed
      await this.updatePaymentAttemptStatus(callbackData.order_id, callbackData, 'completed');

      // Asynchronously get and store receipt
      this.storeReceiptAsync(callbackData.order_id, callbackData.payment_id, paymentAttempt.user_id);
    } catch (error) {
      console.error('Error handling successful payment:', error);
    }
  }

  private async storeReceiptAsync(orderId: string, paymentId: string, userId: string): Promise<void> {
    try {
      const pdfBuffer = await this.liqPayService.getReceiptPDF(orderId, paymentId);
      await this.storeReceiptInDatabase(orderId, paymentId, userId, pdfBuffer);
    } catch (error) {
      console.error('Error storing receipt asynchronously:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    // Database implementation
    return null;
  }

  private async storePaymentAttempt(paymentAttempt: PaymentAttempt): Promise<void> {
    // Database implementation
    console.log('Storing payment attempt:', paymentAttempt.id);
  }

  private async getPaymentAttemptByOrderId(orderId: string): Promise<PaymentAttempt | null> {
    // Database implementation
    return null;
  }

  private async updatePaymentAttemptStatus(orderId: string, data: any, status?: string): Promise<void> {
    // Database implementation
    console.log('Updating payment attempt status:', orderId);
  }

  private async updatePaymentAttemptCheckoutUrl(orderId: string, checkoutUrl: string): Promise<void> {
    // Database implementation
    console.log('Updating checkout URL:', orderId);
  }

  private async updatePaymentAttemptSubscriptionId(orderId: string, subscriptionId?: string): Promise<void> {
    // Database implementation
    console.log('Updating subscription ID:', orderId);
  }

  private async assignPackageToUserWithDuration(userId: string, packageId: string, durationMonths: number): Promise<void> {
    // Database implementation
    console.log(`Assigning package ${packageId} to user ${userId} for ${durationMonths} months`);
  }

  private async getReceiptFromDatabase(orderId: string): Promise<any> {
    // Database implementation
    return null;
  }

  private async storeReceiptInDatabase(orderId: string, paymentId: string, userId: string, data: Buffer, type: 'pdf' | 'html' = 'pdf'): Promise<void> {
    // Database implementation
    console.log(`Storing ${type} receipt for order:`, orderId);
  }
}

export default PaymentController;
