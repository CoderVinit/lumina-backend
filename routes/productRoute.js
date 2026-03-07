import express from 'express';
import { GetPublicProductsController, GetPublicProductByIdController } from '../controller/productController.js';

const router = express.Router();

// GET /api/products
router.get('/', GetPublicProductsController);

// GET /api/products/:id
router.get('/:id', GetPublicProductByIdController);

export default router;
