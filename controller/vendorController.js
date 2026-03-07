import { VendorProfile, Product, Order, OrderItem, User, Category, CategoryRequest } from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';


const getVendorProfile = async (userId) => {
    return VendorProfile.findOne({ where: { userId } });
};


export const RegisterVendorController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeName, description } = req.body;

        if (!storeName) {
            return res.status(400).json({ message: 'Store name is required' });
        }

        const existing = await VendorProfile.findOne({ where: { userId } });
        if (existing) {
            return res.status(400).json({ message: 'Vendor profile already exists' });
        }

        const nameExists = await VendorProfile.findOne({ where: { storeName } });
        if (nameExists) {
            return res.status(400).json({ message: 'Store name already taken' });
        }

        const profile = await VendorProfile.create({ userId, storeName, description });

        // Upgrade user role to vendor
        await User.update({ role: 'vendor' }, { where: { id: userId } });

        return res.status(201).json({
            message: 'Vendor registered successfully. Awaiting admin approval.',
            profile,
        });
    } catch (error) {
        console.error('Register Vendor Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const GetVendorProfileController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await VendorProfile.findOne({
            where: { userId },
            include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'] }],
        });

        if (!profile) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }

        return res.status(200).json({ profile });
    } catch (error) {
        console.error('Get Vendor Profile Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT /api/vendor/profile
export const UpdateVendorProfileController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeName, description } = req.body;

        const profile = await getVendorProfile(userId);
        if (!profile) {
            return res.status(404).json({ message: 'Vendor profile not found' });
        }

        if (storeName && storeName !== profile.storeName) {
            const taken = await VendorProfile.findOne({ where: { storeName } });
            if (taken) {
                return res.status(400).json({ message: 'Store name already taken' });
            }
            profile.storeName = storeName;
        }

        if (description !== undefined) profile.description = description;

        await profile.save();
        return res.status(200).json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error('Update Vendor Profile Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Products ─────────────────────────────────────────────────────────────────

// GET /api/vendor/products
export const GetVendorProductsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const { page = 1, limit = 20, status, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = { vendorId: profile.id };
        if (status) where.status = status;
        if (search) where.name = { [Op.like]: `%${search}%` };

        const { count, rows: products } = await Product.findAndCountAll({
            where,
            include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon'] }],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json({
            products,
            pagination: { total: count, page: Number(page), pages: Math.ceil(count / Number(limit)) },
        });
    } catch (error) {
        console.error('Get Vendor Products Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/vendor/products/:id
export const GetVendorProductController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const product = await Product.findOne({
            where: { id: req.params.id, vendorId: profile.id },
            include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon'] }],
        });

        if (!product) return res.status(404).json({ message: 'Product not found' });

        return res.status(200).json({ product });
    } catch (error) {
        console.error('Get Vendor Product Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// POST /api/vendor/products
export const CreateProductController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        if (profile.status !== 'approved') {
            return res.status(403).json({ message: 'Your vendor account must be approved before listing products' });
        }

        const { name, description, price, originalPrice, stock, sku, imageUrl, images, categoryId } = req.body;

        if (!name || !price) {
            return res.status(400).json({ message: 'Name and price are required' });
        }

        const product = await Product.create({
            vendorId: profile.id,
            name,
            description,
            price,
            originalPrice: originalPrice || null,
            stock: stock || 0,
            sku,
            imageUrl,
            images: images || (imageUrl ? [imageUrl] : []),
            categoryId: categoryId || null,
            status: 'active',
        });

        return res.status(201).json({ message: 'Product created', product });
    } catch (error) {
        console.error('Create Product Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT /api/vendor/products/:id
export const UpdateProductController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const product = await Product.findOne({ where: { id: req.params.id, vendorId: profile.id } });
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const { name, description, price, originalPrice, stock, sku, imageUrl, images, categoryId, status } = req.body;

        if (name !== undefined) product.name = name;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = price;
        if (originalPrice !== undefined) product.originalPrice = originalPrice;
        if (stock !== undefined) product.stock = stock;
        if (sku !== undefined) product.sku = sku;
        if (imageUrl !== undefined) product.imageUrl = imageUrl;
        if (images !== undefined) product.images = images;
        if (categoryId !== undefined) product.categoryId = categoryId;
        // Vendor can toggle active/inactive but not suspended (admin only)
        if (status !== undefined && ['active', 'inactive'].includes(status)) product.status = status;

        await product.save();
        return res.status(200).json({ message: 'Product updated', product });
    } catch (error) {
        console.error('Update Product Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// DELETE /api/vendor/products/:id — soft-delete by deactivating
export const DeleteProductController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const product = await Product.findOne({ where: { id: req.params.id, vendorId: profile.id } });
        if (!product) return res.status(404).json({ message: 'Product not found' });

        product.status = 'inactive';
        await product.save();

        return res.status(200).json({ message: 'Product removed from store' });
    } catch (error) {
        console.error('Delete Product Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Orders ───────────────────────────────────────────────────────────────────

// GET /api/vendor/orders
export const GetVendorOrdersController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const { page = 1, limit = 20, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // Find all product IDs that belong to this vendor
        const vendorProductIds = (await Product.findAll({
            where: { vendorId: profile.id },
            attributes: ['id'],
        })).map(p => p.id);

        if (vendorProductIds.length === 0) {
            return res.status(200).json({ orders: [], pagination: { total: 0, page: 1, pages: 0 } });
        }

        // Find order IDs that contain at least one of this vendor's products
        const orderItemRows = await OrderItem.findAll({
            where: { productId: { [Op.in]: vendorProductIds } },
            attributes: ['orderId'],
            group: ['orderId'],
        });
        const orderIds = orderItemRows.map(r => r.orderId);

        if (orderIds.length === 0) {
            return res.status(200).json({ orders: [], pagination: { total: 0, page: 1, pages: 0 } });
        }

        const where = { id: { [Op.in]: orderIds } };
        if (status) where.status = status;

        const { count, rows: orders } = await Order.findAndCountAll({
            where,
            include: [
                { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'email'] },
                {
                    model: OrderItem,
                    as: 'items',
                    where: { productId: { [Op.in]: vendorProductIds } }, // only show this vendor's items
                    include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl', 'price'] }],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
            distinct: true,
        });

        return res.status(200).json({
            orders,
            pagination: { total: count, page: Number(page), pages: Math.ceil(count / Number(limit)) },
        });
    } catch (error) {
        console.error('Get Vendor Orders Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/vendor/orders/:id
export const GetVendorOrderController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const vendorProductIds = (await Product.findAll({
            where: { vendorId: profile.id },
            attributes: ['id'],
        })).map(p => p.id);

        const order = await Order.findOne({
            where: { id: req.params.id },
            include: [
                { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'email'] },
                {
                    model: OrderItem,
                    as: 'items',
                    where: { productId: { [Op.in]: vendorProductIds } },
                    include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl', 'price'] }],
                },
            ],
        });

        if (!order) return res.status(404).json({ message: 'Order not found' });

        return res.status(200).json({ order });
    } catch (error) {
        console.error('Get Vendor Order Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT /api/vendor/orders/:id/status
export const UpdateOrderStatusController = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['processing', 'shipped', 'delivered'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` });
        }

        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.status = status;
        await order.save();

        return res.status(200).json({ message: 'Order status updated', order });
    } catch (error) {
        console.error('Update Order Status Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

// GET /api/vendor/dashboard
export const GetVendorDashboardController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const vendorProducts = await Product.findAll({
            where: { vendorId: profile.id },
            attributes: ['id', 'name', 'stock', 'status'],
        });
        const vendorProductIds = vendorProducts.map(p => p.id);

        const totalProducts = vendorProducts.length;
        const activeProducts = vendorProducts.filter(p => p.status === 'active').length;
        const lowStockProducts = vendorProducts.filter(p => p.stock <= 5 && p.status === 'active');

        let totalOrders = 0;
        let totalRevenue = 0;
        let recentOrders = [];

        if (vendorProductIds.length > 0) {
            // Total revenue = sum of (priceAtPurchase * quantity) for vendor's order items
            const revenueResult = await OrderItem.findOne({
                where: { productId: { [Op.in]: vendorProductIds } },
                attributes: [[fn('SUM', literal('priceAtPurchase * quantity')), 'total']],
                raw: true,
            });
            totalRevenue = parseFloat(revenueResult?.total || 0);

            // Count distinct orders
            const orderItemRows = await OrderItem.findAll({
                where: { productId: { [Op.in]: vendorProductIds } },
                attributes: ['orderId'],
                group: ['orderId'],
            });
            const orderIds = orderItemRows.map(r => r.orderId);
            totalOrders = orderIds.length;

            if (orderIds.length > 0) {
                recentOrders = await Order.findAll({
                    where: { id: { [Op.in]: orderIds } },
                    include: [{ model: User, as: 'customer', attributes: ['firstName', 'lastName'] }],
                    order: [['createdAt', 'DESC']],
                    limit: 5,
                });
            }
        }

        return res.status(200).json({
            stats: {
                totalRevenue,
                totalOrders,
                totalProducts,
                activeProducts,
            },
            lowStockProducts,
            recentOrders,
        });
    } catch (error) {
        console.error('Vendor Dashboard Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ─── Categories ───────────────────────────────────────────────────────────────

// GET /api/vendor/categories
export const GetCategoriesController = async (req, res) => {
    try {
        const categories = await Category.findAll({
            where: { isActive: true },
            attributes: ['id', 'name', 'icon', 'color'],
            include: [{
                model: Product,
                as: 'products',
                attributes: ['id']
            }]
        });

        // Map to include product count as shown in the screenshot
        const categoriesWithCount = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            productCount: cat.products ? cat.products.length : 0
        }));

        return res.status(200).json({ categories: categoriesWithCount });
    } catch (error) {
        console.error('Get Categories Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// POST /api/vendor/categories/request
export const RequestCategoryController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const { name, reason, exampleProducts } = req.body;
        if (!name || !reason) {
            return res.status(400).json({ message: 'Name and reason are required' });
        }

        const request = await CategoryRequest.create({
            vendorId: profile.id,
            name,
            reason,
            exampleProducts,
            status: 'pending'
        });

        return res.status(201).json({ message: 'Category request submitted successfully', request });
    } catch (error) {
        console.error('Request Category Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/vendor/categories/requests
export const GetVendorCategoryRequestsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        const requests = await CategoryRequest.findAll({
            where: { vendorId: profile.id },
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({ requests });
    } catch (error) {
        console.error('Get Vendor Category Requests Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/vendor/products/bulk/template
export const GetBulkTemplateController = async (req, res) => {
    try {
        const categories = await Category.findAll({
            where: { isActive: true },
            attributes: ['id', 'name'],
        });
        const categoryList = categories.map(c => `${c.id}=${c.name}`).join(' | ');

        const header = 'name,description,price,originalPrice,stock,sku,categoryId';
        const example1 = '"Wireless Bluetooth Headphones","Premium noise-cancelling headphones",2499.00,2999.00,50,WBH-001,1';
        const example2 = '"USB-C Hub Adapter","7-in-1 USB-C hub with HDMI",1299.00,,100,UCH-002,1';
        const comment = `# Available categories: ${categoryList}`;
        const notes = '# Note: originalPrice is optional (leave empty if no discount). Wrap text with commas in double quotes.';

        const csv = [comment, notes, header, example1, example2].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="lumina_product_template.csv"');
        return res.status(200).send(csv);
    } catch (error) {
        console.error('Get Bulk Template Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// POST /api/vendor/products/bulk
export const BulkUploadProductsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await getVendorProfile(userId);
        if (!profile) return res.status(404).json({ message: 'Vendor profile not found' });

        if (profile.status !== 'approved') {
            return res.status(403).json({ message: 'Your vendor account must be approved before listing products' });
        }

        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'No products provided' });
        }

        if (products.length > 100) {
            return res.status(400).json({ message: 'Maximum 100 products per upload' });
        }

        const results = { created: 0, failed: 0, errors: [] };

        for (let i = 0; i < products.length; i++) {
            const row = products[i];
            try {
                if (!row.name || !row.price) {
                    results.errors.push({ row: i + 1, message: 'Name and price are required' });
                    results.failed++;
                    continue;
                }

                const price = parseFloat(row.price);
                if (isNaN(price) || price <= 0) {
                    results.errors.push({ row: i + 1, message: 'Invalid price' });
                    results.failed++;
                    continue;
                }

                await Product.create({
                    vendorId: profile.id,
                    name: row.name.trim(),
                    description: row.description?.trim() || null,
                    price,
                    originalPrice: row.originalPrice ? parseFloat(row.originalPrice) : null,
                    stock: parseInt(row.stock) || 0,
                    sku: row.sku?.trim() || null,
                    categoryId: row.categoryId ? parseInt(row.categoryId) : null,
                    imageUrl: row.imageUrl || null,
                    images: [],
                    status: 'active',
                });
                results.created++;
            } catch (err) {
                results.errors.push({ row: i + 1, message: err.message || 'Unknown error' });
                results.failed++;
            }
        }

        return res.status(200).json({
            message: `Bulk upload complete: ${results.created} created, ${results.failed} failed`,
            ...results,
        });
    } catch (error) {
        console.error('Bulk Upload Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
