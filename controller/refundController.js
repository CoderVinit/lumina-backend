import { Order, OrderItem, Product, Payment } from '../models/index.js';

export const RequestReturnController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId, reason, description } = req.body;

        if (!orderId || !reason) {
            return res.status(400).json({ message: 'orderId and reason are required' });
        }

        const allowedReasons = ['damaged', 'wrong_product', 'other'];
        if (!allowedReasons.includes(reason)) {
            return res.status(400).json({ message: `reason must be one of: ${allowedReasons.join(', ')}` });
        }

        const order = await Order.findOne({ where: { id: orderId, customerId: userId } });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'delivered') {
            return res.status(400).json({ message: 'Only delivered orders can be returned' });
        }

        if (order.returnStatus !== 'none') {
            return res.status(400).json({ message: `Return already ${order.returnStatus}` });
        }

        order.returnStatus = 'requested';
        order.returnReason = reason;
        order.returnDescription = description || '';
        await order.save();

        return res.status(200).json({ message: 'Return request submitted', order });
    } catch (error) {
        console.error('Request Return Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT /api/refund/return/:orderId/approve — Admin approves a return + processes refund
export const ApproveReturnController = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findByPk(orderId, {
            include: [
                { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
                { model: Payment, as: 'payment' }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.returnStatus !== 'requested') {
            return res.status(400).json({ message: 'No pending return request for this order' });
        }

        // Restore product stock
        for (const item of order.items) {
            if (item.product) {
                await Product.increment('stock', {
                    by: item.quantity,
                    where: { id: item.productId }
                });
            }
        }

        // Update payment status to refunded
        if (order.payment) {
            order.payment.status = 'refunded';
            await order.payment.save();
        }

        // Update order
        order.returnStatus = 'approved';
        order.status = 'cancelled';
        order.paymentStatus = 'failed';
        await order.save();

        return res.status(200).json({ message: 'Return approved and refund processed', order });
    } catch (error) {
        console.error('Approve Return Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// PUT /api/refund/return/:orderId/reject — Admin rejects a return
export const RejectReturnController = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.returnStatus !== 'requested') {
            return res.status(400).json({ message: 'No pending return request for this order' });
        }

        order.returnStatus = 'rejected';
        order.returnRejectedReason = reason || '';
        await order.save();

        return res.status(200).json({ message: 'Return rejected', order });
    } catch (error) {
        console.error('Reject Return Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
