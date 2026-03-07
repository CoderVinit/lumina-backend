import { Category, Product } from '../models/index.js';

export const GetPublicCategoriesController = async (req, res) => {
    try {
        const categories = await Category.findAll({
            where: { isActive: true },
            attributes: ['id', 'name', 'icon', 'color'],
            include: [{
                model: Product,
                as: 'products',
                attributes: ['id', 'imageUrl'],
                where: { status: 'active' },
                required: false
            }]
        });

        const categoriesWithCount = categories.map(cat => {
            const products = cat.products || [];
            const firstImage = products.find(p => p.imageUrl)?.imageUrl || null;
            return {
                id: cat.id.toString(),
                name: cat.name,
                icon: cat.icon || '📦',
                color: cat.color,
                productCount: products.length,
                image: firstImage,
            };
        });

        return res.status(200).json({ categories: categoriesWithCount });
    } catch (error) {
        console.error('Get Public Categories Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
