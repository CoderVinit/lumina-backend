import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis connected successfully'));

// Connect to Redis
await redisClient.connect();

// Helper functions for common operations
export const cache = {
    // Get cached data
    async get(key) {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    },

    async set(key, value, expiresInSeconds = 3600) {
        await redisClient.setEx(key, expiresInSeconds, JSON.stringify(value));
    },

    // Delete specific cache key
    async del(key) {
        await redisClient.del(key);
    },

    // Delete keys matching a pattern (e.g., 'products:*')
    async delPattern(pattern) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    },

    // Check if key exists
    async exists(key) {
        return await redisClient.exists(key);
    },

    // Get TTL of a key
    async ttl(key) {
        return await redisClient.ttl(key);
    }
};

export default redisClient;
