import sequelize from '../config/database.js';

// Import all models
import User from './User.js';
import VendorProfile from './VendorProfile.js';
import Category from './Category.js';
import CategoryRequest from './CategoryRequest.js';
import Product from './Product.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Payment from './Payment.js';
import Address from './Address.js';
import Cart from './Cart.js';
import CartItem from './CartItem.js';
import Wishlist from './Wishlist.js';
import Review from './Review.js';

// 1. User & VendorProfile (1-to-1)
User.hasOne(VendorProfile, { foreignKey: 'userId', as: 'vendorProfile', onDelete: 'CASCADE' });
VendorProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 2. User & Order (1-to-Many - Customer has many Orders)
User.hasMany(Order, { foreignKey: 'customerId', as: 'customerOrders' });
Order.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

// 2b. User & Address (1-to-Many - Customer has many Addresses)
User.hasMany(Address, { foreignKey: 'userId', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 3. VendorProfile & Product (1-to-Many - Vendor has many Products)
VendorProfile.hasMany(Product, { foreignKey: 'vendorId', as: 'products' });
Product.belongsTo(VendorProfile, { foreignKey: 'vendorId', as: 'vendor' });

// 4. VendorProfile & CategoryRequest (1-to-Many - Vendor requests Categories)
VendorProfile.hasMany(CategoryRequest, { foreignKey: 'vendorId', as: 'categoryRequests' });
CategoryRequest.belongsTo(VendorProfile, { foreignKey: 'vendorId', as: 'vendor' });

// 5. Category & Product (1-to-Many - Category has many Products)
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// 6. Order & OrderItem (1-to-Many - Order has many Line Items)
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// 7. Product & OrderItem (1-to-Many - Product can be in many OrderItems)
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// 8. Order & Payment (1-to-1 - Order has one Payment record)
Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment', onDelete: 'CASCADE' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// 9. User & Cart (1-to-1 - each customer has one cart)
User.hasOne(Cart, { foreignKey: 'userId', as: 'cart', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 10. Cart & CartItem (1-to-Many - cart has many items)
Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });

// 11. Product & CartItem (1-to-Many - product can be in many carts)
Product.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// 12. User & Wishlist (1-to-Many)
User.hasMany(Wishlist, { foreignKey: 'userId', as: 'wishlistItems', onDelete: 'CASCADE' });
Wishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 13. Product & Wishlist (1-to-Many)
Product.hasMany(Wishlist, { foreignKey: 'productId', as: 'wishlistEntries', onDelete: 'CASCADE' });
Wishlist.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// 14. User & Review (1-to-Many - User writes many Reviews)
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 15. Product & Review (1-to-Many - Product has many Reviews)
Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Export everything along with the connection instance
export {
    sequelize,
    User,
    VendorProfile,
    Category,
    CategoryRequest,
    Product,
    Order,
    OrderItem,
    Payment,
    Address,
    Cart,
    CartItem,
    Wishlist,
    Review
};
