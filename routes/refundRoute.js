import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
    RequestReturnController, ApproveReturnController, RejectReturnController
} from '../controller/refundController.js';

const router = express.Router();

// User requests return (damaged / wrong product)
router.post('/return', verifyToken, RequestReturnController);

// Admin approves/rejects return
router.put('/return/:orderId/approve', verifyToken, requireAdmin, ApproveReturnController);
router.put('/return/:orderId/reject', verifyToken, requireAdmin, RejectReturnController);

export default router;
