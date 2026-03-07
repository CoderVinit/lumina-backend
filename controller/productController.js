import { Product, Category, VendorProfile, Review } from '../models/index.js';
import { Op, where as seqWhere, col } from 'sequelize';

export const GetPublicProductsController = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, search, minPrice, maxPrice, sort, deals } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = { status: 'active' };

        // Ensure we only fetch products where the vendor is also approved/active
        const validVendors = await VendorProfile.findAll({
            where: { status: 'approved' },
            attributes: ['id']
        });
        const validVendorIds = validVendors.map(v => v.id);

        where.vendorId = { [Op.in]: validVendorIds };

        if (deals === 'true') {
            where.originalPrice = { [Op.not]: null };
            where[Op.and] = [seqWhere(col('originalPrice'), { [Op.gt]: col('price') })];
        }

        where.vendorId = { [Op.in]: validVendorIds };

        if (category) {
            where.categoryId = category;
        }

        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price[Op.gte] = Number(minPrice);
            if (maxPrice) where.price[Op.lte] = Number(maxPrice);
        }

        // Sorting
        let order = [['createdAt', 'DESC']]; // default Newest
        switch (sort) {
            case 'price-asc': order = [['price', 'ASC']]; break;
            case 'price-desc': order = [['price', 'DESC']]; break;
            // Add rating logic here if a review model exists in the future
            default: break;
        }

        const { count, rows: products } = await Product.findAndCountAll({
            where,
            include: [
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: VendorProfile, as: 'vendor', attributes: ['storeName'] },
                { model: Review, as: 'reviews', attributes: ['rating'], required: false },
            ],
            order,
            limit: Number(limit),
            offset,
        });

        // Compute average rating and review count for each product
        const productsWithRatings = products.map(p => {
            const data = p.toJSON();
            const ratings = data.reviews || [];
            data.reviewCount = ratings.length;
            data.averageRating = ratings.length > 0
                ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
                : 0;
            delete data.reviews;
            return data;
        });

        return res.status(200).json({
            products: productsWithRatings,
            pagination: {
                total: count,
                page: Number(page),
                pages: Math.ceil(count / Number(limit)),
            }
        });
    } catch (error) {
        console.error('Get Public Products Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const GetPublicProductByIdController = async (req, res) => {
    try {
        const product = await Product.findOne({
            where: { id: req.params.id, status: 'active' },
            include: [
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: VendorProfile, as: 'vendor', attributes: ['storeName'] }
            ]
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Get review summary for this product
        const reviewStats = await Review.findAll({
            where: { productId: product.id },
            attributes: ['rating'],
        });

        const totalReviews = reviewStats.length;
        const averageRating = totalReviews > 0
            ? Math.round((reviewStats.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
            : 0;

        const productData = product.toJSON();
        productData.averageRating = averageRating;
        productData.reviewCount = totalReviews;

        return res.status(200).json({ product: productData });
    } catch (error) {
        console.error('Get Public Product Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
