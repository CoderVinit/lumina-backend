import express from 'express';
import {
    CreateReviewController,
    UpdateReviewController,
    DeleteReviewController,
    GetProductReviewsController,
    CanReviewController,
} from '../controller/reviewController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public: Get reviews for a product
router.get('/product/:productId', GetProductReviewsController);

// Protected: Check if user can review a product
router.get('/can-review/:productId', verifyToken, CanReviewController);

// Protected: Create a review
router.post('/', verifyToken, CreateReviewController);

// Protected: Update a review
router.put('/:id', verifyToken, UpdateReviewController);

// Protected: Delete a review
router.delete('/:id', verifyToken, DeleteReviewController);

export default router;
