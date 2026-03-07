import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireVendor } from '../middleware/requireVendor.js';
import {
    RegisterVendorController,
    GetVendorProfileController,
    UpdateVendorProfileController,
    GetVendorProductsController,
    GetVendorProductController,
    CreateProductController,
    UpdateProductController,
    DeleteProductController,
    GetVendorOrdersController,
    GetVendorOrderController,
    UpdateOrderStatusController,
    GetVendorDashboardController,
    GetCategoriesController,
    RequestCategoryController,
    GetVendorCategoryRequestsController,
    GetBulkTemplateController,
    BulkUploadProductsController,
} from '../controller/vendorController.js';

const router = express.Router();


router.post('/register', verifyToken, RegisterVendorController);


router.get('/profile', verifyToken, requireVendor, GetVendorProfileController);
router.put('/profile', verifyToken, requireVendor, UpdateVendorProfileController);

router.get('/products', verifyToken, requireVendor, GetVendorProductsController);
router.get('/products/bulk/template', verifyToken, requireVendor, GetBulkTemplateController);
router.post('/products/bulk', verifyToken, requireVendor, BulkUploadProductsController);
router.get('/products/:id', verifyToken, requireVendor, GetVendorProductController);
router.post('/products', verifyToken, requireVendor, CreateProductController);
router.put('/products/:id', verifyToken, requireVendor, UpdateProductController);
router.delete('/products/:id', verifyToken, requireVendor, DeleteProductController);

router.get('/orders', verifyToken, requireVendor, GetVendorOrdersController);
router.get('/orders/:id', verifyToken, requireVendor, GetVendorOrderController);
router.put('/orders/:id/status', verifyToken, requireVendor, UpdateOrderStatusController);

router.get('/dashboard', verifyToken, requireVendor, GetVendorDashboardController);

// Categories
router.get('/categories', verifyToken, requireVendor, GetCategoriesController);
router.post('/categories/request', verifyToken, requireVendor, RequestCategoryController);
router.get('/categories/requests', verifyToken, requireVendor, GetVendorCategoryRequestsController);

export default router;