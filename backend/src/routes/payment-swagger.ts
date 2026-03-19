import { Router } from 'express';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import PaymentController from '../controllers/paymentController';

const router = Router();
const paymentController = new PaymentController();

/**
 * @swagger
 * /api/v1/payment/initiate-subscription:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate subscription payment
 *     description: Initiate a payment for a subscription plan using payment gateway
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRequest'
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Subscription plan not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to initiate payment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/initiate-subscription',
  authMiddleware,
  validateRequest,
  paymentController.initiateSubscriptionPayment.bind(paymentController)
);

/**
 * @swagger
 * /api/v1/payment/callback:
 *   post:
 *     tags: [Payments]
 *     summary: Payment callback
 *     description: Handle payment callback from payment gateway
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: string
 *                 description: Base64 encoded payment data from payment gateway
 *               signature:
 *                 type: string
 *                 description: Payment signature from payment gateway
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the callback was processed
 *                 message:
 *                   type: string
 *                   description: Response message
 *       400:
 *         description: Invalid callback data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to process callback
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/callback',
  validateRequest,
  paymentController.handlePaymentCallback.bind(paymentController)
);

/**
 * @swagger
 * /api/v1/payment/status/{orderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment status (authenticated)
 *     description: Get the status of a specific payment (requires authentication)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment order ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_id:
 *                       type: string
 *                       description: Order ID
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed, expired, refunded]
 *                       description: Payment status
 *                     amount:
 *                       type: number
 *                       format: float
 *                       description: Payment amount
 *                     currency:
 *                       type: string
 *                       description: Currency code
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: Payment creation date
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       description: Last update date
 *                 message:
 *                   type: string
 *                   description: Response message
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch payment status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/status/:orderId',
  authMiddleware,
  validateRequest,
  paymentController.getPaymentStatus.bind(paymentController)
);

/**
 * @swagger
 * /api/v1/payment/status/public/{orderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment status (public)
 *     description: Get the status of a specific payment (public endpoint)
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment order ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_id:
 *                       type: string
 *                       description: Order ID
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed, expired, refunded]
 *                       description: Payment status
 *                     amount:
 *                       type: number
 *                       format: float
 *                       description: Payment amount
 *                     currency:
 *                       type: string
 *                       description: Currency code
 *                 message:
 *                   type: string
 *                   description: Response message
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch payment status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/status/public/:orderId',
  validateRequest,
  paymentController.getPublicPaymentStatus.bind(paymentController)
);

/**
 * @swagger
 * /api/v1/payment/check-status/{orderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Check payment status
 *     description: Check payment status directly with payment gateway
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment order ID
 *     responses:
 *       200:
 *         description: Payment status checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_id:
 *                       type: string
 *                       description: Order ID
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed, expired, refunded]
 *                       description: Payment status
 *                     amount:
 *                       type: number
 *                       format: float
 *                       description: Payment amount
 *                     currency:
 *                       type: string
 *                       description: Currency code
 *                     gateway_status:
 *                       type: string
 *                       description: Status from payment gateway
 *                 message:
 *                   type: string
 *                   description: Response message
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to check payment status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/check-status/:orderId',
  authMiddleware,
  validateRequest,
  paymentController.checkPaymentStatusWithMonobank.bind(paymentController)
);

/**
 * @swagger
 * /api/v1/payment/receipt/{orderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment receipt
 *     description: Get the receipt for a completed payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment order ID
 *     responses:
 *       200:
 *         description: Receipt retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_id:
 *                       type: string
 *                       description: Order ID
 *                     receipt_url:
 *                       type: string
 *                       format: uri
 *                       description: URL to download receipt
 *                     pdf_data:
 *                       type: string
 *                       description: Base64 encoded PDF receipt
 *                     html_data:
 *                       type: string
 *                       description: HTML receipt content
 *                 message:
 *                   type: string
 *                   description: Response message
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Receipt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to fetch receipt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/receipt/:orderId',
  authMiddleware,
  validateRequest,
  paymentController.getReceipt.bind(paymentController)
);

/**
 * @swagger
 * /api/v1/payment/verify-subscription:
 *   post:
 *     tags: [Payments]
 *     summary: Verify subscription
 *     description: Verify the status of a user's subscription
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the subscription is valid
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       type: object
 *                       properties:
 *                         plan:
 *                           type: string
 *                           description: Subscription plan name
 *                         status:
 *                           type: string
 *                           enum: [active, inactive, expired]
 *                           description: Subscription status
 *                         expires_at:
 *                           type: string
 *                           format: date-time
 *                           description: Subscription expiry date
 *                         features:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: List of subscription features
 *                 message:
 *                   type: string
 *                   description: Response message
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to verify subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/verify-subscription',
  authMiddleware,
  validateRequest,
  paymentController.verifySubscription.bind(paymentController)
);

/**
 * @swagger
 * /api/v1/payment/subscriptions/{subscriptionId}/cancel:
 *   delete:
 *     tags: [Payments]
 *     summary: Cancel subscription
 *     description: Cancel an active subscription
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the subscription was cancelled
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription_id:
 *                       type: string
 *                       description: Subscription ID
 *                     status:
 *                       type: string
 *                       enum: [cancelled]
 *                       description: Subscription status
 *                     cancelled_at:
 *                       type: string
 *                       format: date-time
 *                       description: Cancellation date
 *                 message:
 *                   type: string
 *                   description: Response message
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Subscription not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to cancel subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  '/subscriptions/:subscriptionId/cancel',
  authMiddleware,
  validateRequest,
  paymentController.cancelSubscription.bind(paymentController)
);

export default router;
