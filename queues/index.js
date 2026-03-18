import { Queue, Worker } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

// Parse Redis URL into connection object for BullMQ (ioredis format)
function parseRedisUrl(url) {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port, 10) || 6379,
            password: parsed.password || undefined,
            username: parsed.username !== 'default' ? parsed.username : undefined,
        };
    } catch {
        return { host: '127.0.0.1', port: 6379 };
    }
}

export const redisConnection = parseRedisUrl(
    process.env.REDIS_URL || 'redis://localhost:6379'
);

// ─── Queues ────────────────────────────────────────────
export const orderQueue = new Queue('order-processing', { connection: redisConnection });
export const notificationQueue = new Queue('notifications', { connection: redisConnection });
export const stockQueue = new Queue('stock-updates', { connection: redisConnection });

console.log('📬 BullMQ queues initialized');
