import { Router } from 'express';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import PaymentController from '../controllers/paymentController';

const router = Router();
const paymentController = new PaymentController();

// Initiate subscription payment
router.post(
  '/initiate-subscription',
  authMiddleware,
  validateRequest,
  paymentController.initiateSubscriptionPayment.bind(paymentController)
);

// Handle LiqPay callback
router.post(
  '/callback',
  validateRequest,
  paymentController.handlePaymentCallback.bind(paymentController)
);

// Get payment status (authenticated)
router.get(
  '/status/:orderId',
  authMiddleware,
  validateRequest,
  paymentController.getPaymentStatus.bind(paymentController)
);

// Get payment status (public)
router.get(
  '/status/public/:orderId',
  validateRequest,
  paymentController.getPublicPaymentStatus.bind(paymentController)
);

// Get receipt
router.get(
  '/receipt/:orderId',
  authMiddleware,
  validateRequest,
  paymentController.getReceipt.bind(paymentController)
);

// Cancel subscription
router.delete(
  '/subscriptions/:subscriptionId/cancel',
  authMiddleware,
  validateRequest,
  paymentController.cancelSubscription.bind(paymentController)
);

export default router;
