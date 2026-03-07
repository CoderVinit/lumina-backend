import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
    GetAdminDashboardController,
    GetUsersController,
    UpdateUserRoleController,
    DeleteUserController,
    GetVendorsController,
    UpdateVendorStatusController,
    GetAdminProductsController,
    UpdateProductStatusController,
    GetAllCategoriesController,
    CreateCategoryController,
    UpdateCategoryController,
    DeleteCategoryController,
    GetAdminOrdersController,
    UpdateAdminOrderStatusController,
    GetAdminCategoryRequestsController,
    UpdateCategoryRequestStatusController
} from '../controller/adminController.js';

const router = express.Router();

router.use(verifyToken, requireAdmin);

// Dashboard
router.get('/dashboard', GetAdminDashboardController);

// Users
router.get('/users', GetUsersController);
router.put('/users/:id/role', UpdateUserRoleController);
router.delete('/users/:id', DeleteUserController);

// Vendors
router.get('/vendors', GetVendorsController);
router.put('/vendors/:id/status', UpdateVendorStatusController);

// Products
router.get('/products', GetAdminProductsController);
router.put('/products/:id/status', UpdateProductStatusController);

// Categories
router.get('/categories', GetAllCategoriesController);
router.post('/categories', CreateCategoryController);
router.put('/categories/:id', UpdateCategoryController);
router.delete('/categories/:id', DeleteCategoryController);
router.get('/categories/requests', GetAdminCategoryRequestsController);
router.put('/categories/requests/:id', UpdateCategoryRequestStatusController);

// Orders
router.get('/orders', GetAdminOrdersController);
router.put('/orders/:id/status', UpdateAdminOrderStatusController);

export default router;