import { Review, Product, User, Order, OrderItem } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

// Create a review (only if user has purchased the product)
export const CreateReviewController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, rating, title, comment } = req.body;

        if (!productId || !rating) {
            return res.status(400).json({ message: 'productId and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Check product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user has purchased this product (order must be delivered)
        const hasPurchased = await Order.findOne({
            where: {
                customerId: userId,
                status: 'delivered',
            },
            include: [{
                model: OrderItem,
                as: 'items',
                where: { productId },
            }],
        });

        if (!hasPurchased) {
            return res.status(403).json({ message: 'You can only review products you have purchased' });
        }

        // Check if user already reviewed this product
        const existingReview = await Review.findOne({ where: { userId, productId } });
        if (existingReview) {
            return res.status(409).json({ message: 'You have already reviewed this product' });
        }

        const review = await Review.create({
            userId,
            productId,
            rating,
            title,
            comment,
        });

        // Fetch the review with user info
        const fullReview = await Review.findByPk(review.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
        });

        return res.status(201).json({ message: 'Review submitted successfully', review: fullReview });
    } catch (error) {
        console.error('Create Review Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Update a review
export const UpdateReviewController = async (req, res) => {
    try {
        const userId = req.user.id;
        const reviewId = Number(req.params.id);
        const { rating, title, comment } = req.body;

        const review = await Review.findByPk(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.userId !== userId) {
            return res.status(403).json({ message: 'You can only edit your own reviews' });
        }

        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        await review.update({
            rating: rating || review.rating,
            title: title !== undefined ? title : review.title,
            comment: comment !== undefined ? comment : review.comment,
        });

        const updatedReview = await Review.findByPk(review.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
        });

        return res.status(200).json({ message: 'Review updated', review: updatedReview });
    } catch (error) {
        console.error('Update Review Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete a review
export const DeleteReviewController = async (req, res) => {
    try {
        const userId = req.user.id;
        const reviewId = Number(req.params.id);

        const review = await Review.findByPk(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.userId !== userId) {
            return res.status(403).json({ message: 'You can only delete your own reviews' });
        }

        await review.destroy();
        return res.status(200).json({ message: 'Review deleted' });
    } catch (error) {
        console.error('Delete Review Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get reviews for a product (public)
export const GetProductReviewsController = async (req, res) => {
    try {
        const productId = Number(req.params.productId);
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const { count, rows: reviews } = await Review.findAndCountAll({
            where: { productId },
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        // Calculate rating summary
        const allRatings = await Review.findAll({
            where: { productId },
            attributes: ['rating'],
        });

        const totalReviews = allRatings.length;
        const averageRating = totalReviews > 0
            ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;

        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allRatings.forEach(r => {
            ratingDistribution[r.rating]++;
        });

        return res.status(200).json({
            reviews,
            summary: {
                averageRating: Math.round(averageRating * 10) / 10,
                totalReviews,
                ratingDistribution,
            },
            pagination: {
                total: count,
                page: Number(page),
                pages: Math.ceil(count / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get Product Reviews Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Check if user can review a product
export const CanReviewController = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = Number(req.params.productId);

        // Check if already reviewed
        const existingReview = await Review.findOne({ where: { userId, productId } });
        if (existingReview) {
            return res.status(200).json({ canReview: false, reason: 'already_reviewed', existingReview });
        }

        // Check if user has purchased this product
        const hasPurchased = await Order.findOne({
            where: {
                customerId: userId,
                status: 'delivered',
            },
            include: [{
                model: OrderItem,
                as: 'items',
                where: { productId },
            }],
        });

        if (!hasPurchased) {
            return res.status(200).json({ canReview: false, reason: 'not_purchased' });
        }

        return res.status(200).json({ canReview: true });
    } catch (error) {
        console.error('Can Review Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
