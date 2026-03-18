import { Cart, CartItem, Product } from '../models/index.js';
import { cache } from '../config/redis.js';

const CART_TTL = 604800; // 7 days in seconds
const cartKey = (userId) => `cart:${userId}`;

// Helper: get or create a cart for the logged-in user
const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
        cart = await Cart.create({ userId });
    }
    return cart;
};

// Helper: fetch full cart from DB and store in Redis
const getCartFromDB = async (userId) => {
    const cart = await Cart.findOne({
        where: { userId },
        include: [
            {
                model: CartItem,
                as: 'items',
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'price', 'stock', 'status', 'imageUrl'],
                    },
                ],
            },
        ],
    });
    return cart;
};

// Helper: refresh Redis cart cache from DB
const refreshCartCache = async (userId) => {
    const cart = await getCartFromDB(userId);
    if (cart) {
        await cache.set(cartKey(userId), cart.toJSON(), CART_TTL);
    } else {
        await cache.del(cartKey(userId));
    }
    return cart;
};

// GET /api/cart — fetch the user's cart with all items + product details
export const GetCartController = async (req, res) => {
    try {
        const userId = req.user.id;

        // Try Redis first
        const cached = await cache.get(cartKey(userId));
        if (cached) {
            return res.status(200).json({ cart: cached, source: 'cache' });
        }

        // Cache miss — fetch from DB and cache
        const cart = await getCartFromDB(userId);
        if (!cart) {
            return res.status(200).json({ cart: { items: [] } });
        }

        await cache.set(cartKey(userId), cart.toJSON(), CART_TTL);
        return res.status(200).json({ cart });
    } catch (error) {
        console.error('Get Cart Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// POST /api/cart/items — add a product to the cart (or increment quantity if already present)
export const AddToCartController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'productId is required' });
        }

        // Validate product exists and is active
        const product = await Product.findOne({ where: { id: productId, status: 'active' } });
        if (!product) {
            return res.status(404).json({ message: 'Product not found or unavailable' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: 'Not enough stock available' });
        }

        const cart = await getOrCreateCart(userId);

        // Upsert: if product already in cart, increase quantity; else create new item
        const [cartItem, created] = await CartItem.findOrCreate({
            where: { cartId: cart.id, productId },
            defaults: { quantity },
        });

        if (!created) {
            const newQty = cartItem.quantity + quantity;
            if (newQty > product.stock) {
                return res.status(400).json({ message: 'Not enough stock available' });
            }
            cartItem.quantity = newQty;
            await cartItem.save();
        }

        // Refresh Redis cache
        await refreshCartCache(userId);

        return res.status(200).json({
            message: created ? 'Item added to cart' : 'Cart item quantity updated',
            cartItem,
        });
    } catch (error) {
        console.error('Add to Cart Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT /api/cart/items/:productId — set an item's quantity explicitly
export const UpdateCartItemController = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.productId;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (quantity > product.stock) {
            return res.status(400).json({ message: 'Not enough stock available' });
        }

        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const cartItem = await CartItem.findOne({ where: { cartId: cart.id, productId } });
        if (!cartItem) {
            return res.status(404).json({ message: 'Item not in cart' });
        }

        cartItem.quantity = quantity;
        await cartItem.save();

        // Refresh Redis cache
        await refreshCartCache(userId);

        return res.status(200).json({ message: 'Cart item updated', cartItem });
    } catch (error) {
        console.error('Update Cart Item Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// DELETE /api/cart/items/:productId — remove a specific item from the cart
export const RemoveFromCartController = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.productId;

        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const deleted = await CartItem.destroy({ where: { cartId: cart.id, productId } });
        if (!deleted) {
            return res.status(404).json({ message: 'Item not in cart' });
        }

        // Refresh Redis cache
        await refreshCartCache(userId);

        return res.status(200).json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from Cart Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// DELETE /api/cart — clear all items from the cart
export const ClearCartController = async (req, res) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({ where: { userId } });
        if (!cart) {
            return res.status(200).json({ message: 'Cart is already empty' });
        }

        await CartItem.destroy({ where: { cartId: cart.id } });

        // Clear Redis cache
        await cache.del(cartKey(userId));

        return res.status(200).json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear Cart Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
