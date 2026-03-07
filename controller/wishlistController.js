import { Wishlist, Product, Category } from '../models/index.js';

// Toggle wishlist (add if not present, remove if already present)
export const ToggleWishlistController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'productId is required' });
        }

        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const existing = await Wishlist.findOne({ where: { userId, productId } });

        if (existing) {
            await existing.destroy();
            return res.status(200).json({ message: 'Removed from wishlist', wishlisted: false });
        }

        await Wishlist.create({ userId, productId });
        return res.status(201).json({ message: 'Added to wishlist', wishlisted: true });
    } catch (error) {
        console.error('Toggle Wishlist Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get user's wishlist
export const GetWishlistController = async (req, res) => {
    try {
        const userId = req.user.id;

        const items = await Wishlist.findAll({
            where: { userId },
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'price', 'originalPrice', 'imageUrl', 'stock'],
                    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({ wishlist: items });
    } catch (error) {
        console.error('Get Wishlist Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Remove from wishlist
export const RemoveWishlistController = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = Number(req.params.productId);

        const item = await Wishlist.findOne({ where: { userId, productId } });
        if (!item) {
            return res.status(404).json({ message: 'Item not in wishlist' });
        }

        await item.destroy();
        return res.status(200).json({ message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove Wishlist Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
