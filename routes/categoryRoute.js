import express from 'express';
import { GetPublicCategoriesController } from '../controller/categoryController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Cache categories for 30 minutes (1800 seconds) - they rarely change
router.get('/', cacheMiddleware(1800), GetPublicCategoriesController);

export default router;
