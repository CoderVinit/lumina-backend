import { cache } from '../config/redis.js';

export const cacheMiddleware = (duration = 300, keyGenerator = null) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = keyGenerator 
            ? keyGenerator(req) 
            : `cache:${req.originalUrl}`;

        try {
            const cachedData = await cache.get(key);

            if (cachedData) {
                return res.json({
                    ...cachedData,
                    cached: true
                });
            }

            // Store original res.json to intercept response
            const originalJson = res.json.bind(res);
            
            res.json = async (data) => {
                // Cache successful responses only
                if (res.statusCode === 200) {
                    await cache.set(key, data, duration);
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next(); 
        }
    };
};


export const invalidateCache = (...patterns) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = async (data) => {
            // Invalidate cache after successful mutation
            if (res.statusCode >= 200 && res.statusCode < 300) {
                for (const pattern of patterns) {
                    await cache.delPattern(pattern);
                }
            }
            return originalJson(data);
        };

        next();
    };
};

export default cacheMiddleware;
