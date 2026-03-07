import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { CreateRazorpayOrderController, VerifyPaymentController, CreateCODOrderController } from '../controller/paymentController.js';

const router = express.Router();

router.post('/order', verifyToken, CreateRazorpayOrderController);
router.post('/cod', verifyToken, CreateCODOrderController);
router.post('/verify', verifyToken, VerifyPaymentController);

export default router;
