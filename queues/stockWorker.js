import { Worker } from 'bullmq';
import { redisConnection } from './index.js';
import { Product } from '../models/index.js';

// ─── Stock Update Worker ───────────────────────────────
// Handles stock decrements in the background after checkout
const stockWorker = new Worker(
    'stock-updates',
    async (job) => {
        const { type, items } = job.data;

        switch (type) {
            case 'decrement': {
                for (const item of items) {
                    await Product.decrement('stock', {
                        by: item.quantity,
                        where: { id: item.productId },
                    });
                    console.log(`📉 Stock decremented: product #${item.productId} by ${item.quantity}`);
                }
                break;
            }

            case 'restore': {
                // Used for refunds / cancelled orders
                for (const item of items) {
                    await Product.increment('stock', {
                        by: item.quantity,
                        where: { id: item.productId },
                    });
                    console.log(`📈 Stock restored: product #${item.productId} by ${item.quantity}`);
                }
                break;
            }

            default:
                console.log(`Unknown stock job type: ${type}`);
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
);

stockWorker.on('completed', (job) => {
    console.log(`✅ Stock job ${job.id} completed`);
});

stockWorker.on('failed', (job, err) => {
    console.error(`❌ Stock job ${job?.id} failed:`, err.message);
});

export default stockWorker;
