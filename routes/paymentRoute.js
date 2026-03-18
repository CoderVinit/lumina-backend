import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import { CreateRazorpayOrderController, VerifyPaymentController, CreateCODOrderController } from '../controller/paymentController.js';

const router = express.Router();

router.post('/order', verifyToken, paymentLimiter, CreateRazorpayOrderController);
router.post('/cod', verifyToken, paymentLimiter, CreateCODOrderController);
router.post('/verify', verifyToken, paymentLimiter, VerifyPaymentController);

export default router;
