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

// Handle payment gateway callback (Monobank)
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

// Check payment status directly with payment gateway
router.get(
  '/check-status/:orderId',
  authMiddleware,
  validateRequest,
  paymentController.checkPaymentStatusWithMonobank.bind(paymentController)
);

// Get receipt
router.get(
  '/receipt/:orderId',
  authMiddleware,
  validateRequest,
  paymentController.getReceipt.bind(paymentController)
);

// Verify subscription
router.post(
  '/verify-subscription',
  authMiddleware,
  validateRequest,
  paymentController.verifySubscription.bind(paymentController)
);

// Get wallet cards
router.get(
  '/wallet/cards',
  authMiddleware,
  validateRequest,
  paymentController.getWalletCards.bind(paymentController)
);

// Initiate recurring subscription payment
router.post(
  '/initiate-recurring-subscription',
  authMiddleware,
  validateRequest,
  paymentController.initiateRecurringSubscription.bind(paymentController)
);

// Handle recurring charge webhook (Monobank)
router.post(
  '/recurring/charge',
  validateRequest,
  paymentController.handleRecurringChargeCallback.bind(paymentController)
);

// Handle recurring status webhook (Monobank)
router.post(
  '/recurring/status',
  validateRequest,
  paymentController.handleRecurringStatusCallback.bind(paymentController)
);

// Cancel subscription
router.delete(
  '/subscriptions/:subscriptionId/cancel',
  authMiddleware,
  validateRequest,
  paymentController.cancelSubscription.bind(paymentController)
);

export default router;
