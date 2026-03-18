import { Worker } from 'bullmq';
import { redisConnection } from './index.js';
import { Order, OrderItem, Product } from '../models/index.js';

// ─── Order Processing Worker ───────────────────────────
// Handles post-checkout tasks: confirmation, status updates, etc.
const orderWorker = new Worker(
    'order-processing',
    async (job) => {
        const { orderId, userId, type } = job.data;

        switch (type) {
            case 'order-created': {
                console.log(`📦 Processing new order #${orderId} for user ${userId}`);

                // Simulate sending order confirmation (replace with email service)
                console.log(`✉️  Order confirmation sent for order #${orderId}`);

                // Auto-update order status after processing
                await Order.update(
                    { status: 'confirmed' },
                    { where: { id: orderId } }
                );
                console.log(`✅ Order #${orderId} confirmed`);
                break;
            }

            case 'order-shipped': {
                console.log(`🚚 Order #${orderId} marked as shipped`);
                // Could trigger shipping notification email here
                break;
            }

            case 'order-delivered': {
                console.log(`📬 Order #${orderId} delivered`);
                break;
            }

            default:
                console.log(`Unknown order job type: ${type}`);
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
);

orderWorker.on('completed', (job) => {
    console.log(`✅ Order job ${job.id} completed`);
});

orderWorker.on('failed', (job, err) => {
    console.error(`❌ Order job ${job?.id} failed:`, err.message);
});

export default orderWorker;
