import express from 'express';
import { GetPublicProductsController, GetPublicProductByIdController } from '../controller/productController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// GET /api/products - Cache for 5 minutes
router.get('/', cacheMiddleware(300), GetPublicProductsController);

// GET /api/products/:id - Cache for 10 minutes
router.get('/:id', cacheMiddleware(600), GetPublicProductByIdController);

export default router;
