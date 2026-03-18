import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order, OrderItem, Cart, CartItem, Product, Payment } from '../models/index.js';
import { orderQueue, notificationQueue, stockQueue } from '../queues/index.js';

export const CreateRazorpayOrderController = async (req, res) => {
    try {
        const { amount } = req.body;
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET_KEY,
        });

        const options = {
            amount: Math.round(amount * 100),
            currency: process.env.CURRENCY || "INR",
            receipt: `receipt_${Date.now()}`
        };

        const paymentOrder = await razorpay.orders.create(options);
        res.status(200).json({ success: true, paymentOrder });
    } catch (error) {
        console.error('Razorpay generate order error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
};

export const VerifyPaymentController = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, shippingAddress } = req.body;
        const userId = req.user.id;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {

            const cart = await Cart.findOne({
                where: { userId },
                include: [{ model: CartItem, as: 'items', include: [{ model: Product, as: 'product' }] }]
            });

            if (!cart || !cart.items || cart.items.length === 0) {
                return res.status(400).json({ success: false, message: 'Cart is empty' });
            }

            // Create Order
            const newOrder = await Order.create({
                customerId: userId,
                totalAmount: amount,
                shippingAddress: typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress),
                paymentStatus: 'paid',
                status: 'processing'
            });

            // Create Order Items
            const orderItems = cart.items.map(item => ({
                orderId: newOrder.id,
                productId: item.productId,
                quantity: item.quantity,
                priceAtPurchase: item.product.price
            }));
            await OrderItem.bulkCreate(orderItems);

            // Record Payment
            await Payment.create({
                orderId: newOrder.id,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                amount: amount,
                status: 'captured',
            });

            // Clean Cart
            await CartItem.destroy({ where: { cartId: cart.id } });

            // Background jobs: stock update, order processing, notification
            const stockItems = cart.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
            }));

            await stockQueue.add('decrement-stock', {
                type: 'decrement',
                items: stockItems,
            });

            await orderQueue.add('process-order', {
                type: 'order-created',
                orderId: newOrder.id,
                userId,
            });

            await notificationQueue.add('order-confirm', {
                type: 'order-confirmation',
                userId,
                data: { orderId: newOrder.id, amount },
            });

            res.status(200).json({ success: true, message: 'Payment successful', orderId: newOrder.id });
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};

export const CreateCODOrderController = async (req, res) => {
    try {
        const { amount, shippingAddress } = req.body;
        const userId = req.user.id;

        const cart = await Cart.findOne({
            where: { userId },
            include: [{ model: CartItem, as: 'items', include: [{ model: Product, as: 'product' }] }]
        });

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        // Create Order
        const newOrder = await Order.create({
            customerId: userId,
            totalAmount: amount,
            shippingAddress: typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress),
            paymentStatus: 'pending',
            status: 'processing'
        });

        // Create Order Items
        const orderItems = cart.items.map(item => ({
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: item.product.price
        }));
        await OrderItem.bulkCreate(orderItems);

        // Record Payment as COD
        await Payment.create({
            orderId: newOrder.id,
            razorpayOrderId: `cod_order_${newOrder.id}_${Date.now()}`,
            razorpayPaymentId: `cod_payment_${newOrder.id}`,
            amount: amount,
            status: 'created',
        });

        // Clean Cart
        await CartItem.destroy({ where: { cartId: cart.id } });

        // Background jobs: stock update, order processing, notification
        const stockItems = cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
        }));

        await stockQueue.add('decrement-stock', {
            type: 'decrement',
            items: stockItems,
        });

        await orderQueue.add('process-order', {
            type: 'order-created',
            orderId: newOrder.id,
            userId,
        });

        await notificationQueue.add('order-confirm', {
            type: 'order-confirmation',
            userId,
            data: { orderId: newOrder.id, amount },
        });

        res.status(200).json({ success: true, message: 'Order created successfully', orderId: newOrder.id });
    } catch (error) {
        console.error('Create COD order error:', error);
        res.status(500).json({ success: false, message: 'Order creation failed' });
    }
};

