import { User, VendorProfile, Product, Category, Order, OrderItem, CategoryRequest, Payment } from '../models/index.js';
import { notificationQueue } from '../queues/index.js';

export const GetAdminDashboardController = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const vendorProfiles = await VendorProfile.findAll();
        const totalVendors = vendorProfiles.length;
        const pendingVendors = vendorProfiles.filter(v => v.status === 'pending').length;

        const totalProducts = await Product.count();

        // Sum total revenue from all orders (where delivered/shipped/processing)
        const orders = await Order.findAll({
            where: { status: ['processing', 'shipped', 'delivered'] }
        });

        const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

        // Revenue over time (last 12 months)
        const revenueByMonth = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = d.getMonth();
            const year = d.getFullYear();

            const monthOrders = orders.filter(o => {
                const od = new Date(o.createdAt);
                return od.getMonth() === month && od.getFullYear() === year;
            });

            const monthlyRevenue = monthOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
            revenueByMonth.push({
                month: monthNames[month],
                revenue: monthlyRevenue
            });
        }

        // Order distribution by category
        const categories = await Category.findAll();
        const orderDistribution = await Promise.all(categories.map(async (cat) => {
            const productIds = await Product.findAll({ where: { categoryId: cat.id }, attributes: ['id'] }).then(ps => ps.map(p => p.id));
            const items = await OrderItem.count({
                where: { productId: productIds }
            });
            return {
                name: cat.name,
                value: items,
                color: cat.color || '#3B82F6'
            };
        }));

        const totalItems = orderDistribution.reduce((sum, d) => sum + d.value, 0);
        const finalDistribution = orderDistribution
            .filter(d => d.value > 0)
            .map(d => ({
                ...d,
                value: totalItems > 0 ? Math.round((d.value / totalItems) * 100) : 0
            }));

        const recentOrders = await Order.findAll({
            include: [{ model: User, as: 'customer', attributes: ['firstName', 'lastName'] }],
            order: [['createdAt', 'DESC']],
            limit: 5,
        });

        return res.status(200).json({
            stats: {
                totalUsers,
                totalVendors,
                pendingVendors,
                totalProducts,
                totalRevenue,
            },
            charts: {
                revenueData: revenueByMonth,
                orderDistribution: finalDistribution,
            },
            recentOrders,
        });
    } catch (error) {
        console.error('Admin Dashboard Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const GetUsersController = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['passwordHash'] },
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ users });
    } catch (error) {
        console.error('Get Users Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const UpdateUserRoleController = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!['customer', 'vendor', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        user.role = role;
        await user.save();

        return res.status(200).json({ message: 'User role updated', user: { id: user.id, role: user.role } });
    } catch (error) {
        console.error('Update User Role Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const DeleteUserController = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Safety check avoiding self-deletion
        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        await user.destroy();
        return res.status(200).json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete User Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Vendors ──────────────────────────────────────────────────────────────────
export const GetVendorsController = async (req, res) => {
    try {
        const vendors = await VendorProfile.findAll({
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'isActive'] }],
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ vendors });
    } catch (error) {
        console.error('Get Vendors Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const UpdateVendorStatusController = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'approved', 'suspended'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const profile = await VendorProfile.findByPk(req.params.id);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        profile.status = status;
        await profile.save();

        return res.status(200).json({ message: `Vendor status updated to ${status}`, profile });
    } catch (error) {
        console.error('Update Vendor Status Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const GetAdminProductsController = async (req, res) => {
    try {
        const products = await Product.findAll({
            include: [
                { model: VendorProfile, as: 'vendor', attributes: ['storeName'] },
                { model: Category, as: 'category', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ products });
    } catch (error) {
        console.error('Get Admin Products Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const UpdateProductStatusController = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        product.status = status;
        await product.save();

        return res.status(200).json({ message: `Product status updated to ${status}`, product });
    } catch (error) {
        console.error('Update Product Status Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const CreateCategoryController = async (req, res) => {
    try {
        const { name, icon, color, isActive } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required' });

        const category = await Category.create({ name, icon, color, isActive: isActive !== false });
        return res.status(201).json({ message: 'Category created', category });
    } catch (error) {
        console.error('Create Category Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const UpdateCategoryController = async (req, res) => {
    try {
        const { name, icon, color, isActive } = req.body;
        const category = await Category.findByPk(req.params.id);

        if (!category) return res.status(404).json({ message: 'Category not found' });

        if (name !== undefined) category.name = name;
        if (icon !== undefined) category.icon = icon;
        if (color !== undefined) category.color = color;
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();
        return res.status(200).json({ message: 'Category updated', category });
    } catch (error) {
        console.error('Update Category Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/admin/categories
export const GetAllCategoriesController = async (req, res) => {
    try {
        const categories = await Category.findAll({
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ categories });
    } catch (error) {
        console.error('Get All Categories Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const DeleteCategoryController = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        // Soft delete
        category.isActive = false;
        await category.save();

        return res.status(200).json({ message: 'Category deactivated' });
    } catch (error) {
        console.error('Delete Category Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/admin/categories/requests
export const GetAdminCategoryRequestsController = async (req, res) => {
    try {
        const requests = await CategoryRequest.findAll({
            include: [{ model: VendorProfile, as: 'vendor', attributes: ['storeName'] }],
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json({ requests });
    } catch (error) {
        console.error('Get Admin Category Requests Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT /api/admin/categories/requests/:id
export const UpdateCategoryRequestStatusController = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const request = await CategoryRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (status === 'approved') {
            // Check if category with same name already exists
            const existing = await Category.findOne({ where: { name: request.name } });
            if (existing) {
                // If it exists but is inactive, reactivate it
                if (!existing.isActive) {
                    existing.isActive = true;
                    await existing.save();
                }
                // Mark request as approved even if category already exists
            } else {
                await Category.create({
                    name: request.name,
                    icon: 'Plus',
                    color: '#3b82f6',
                    isActive: true
                });
            }
        }

        request.status = status;
        await request.save();

        return res.status(200).json({ message: `Category request ${status}`, request });
    } catch (error) {
        console.error('Update Category Request Status Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const GetAdminOrdersController = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                { model: User, as: 'customer', attributes: ['firstName', 'lastName', 'email'] },
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product', attributes: ['name', 'price'] }]
                },
                { model: Payment, as: 'payment', attributes: ['status', 'amount'] }
            ],
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ orders });
    } catch (error) {
        console.error('Get Admin Orders Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const UpdateAdminOrderStatusController = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` });
        }

        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.status = status;
        await order.save();

        // Send notification email based on status change
        if (status === 'shipped') {
            await notificationQueue.add('order-shipped', {
                type: 'order-shipped',
                userId: order.customerId,
                data: { 
                    orderId: order.id,
                    trackingNumber: req.body.trackingNumber || null,
                    deliveryDate: req.body.deliveryDate || null,
                },
            });
        } else if (status === 'delivered') {
            await notificationQueue.add('order-delivered', {
                type: 'order-delivered',
                userId: order.customerId,
                data: { orderId: order.id },
            });
        }

        return res.status(200).json({ message: `Order status updated to ${status}`, order });
    } catch (error) {
        console.error('Update Admin Order Status Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
