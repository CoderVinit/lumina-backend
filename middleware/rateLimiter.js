import redisClient from '../config/redis.js';

/**
 * Redis-backed rate limiter middleware
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 min)
 * @param {number} options.max - Max requests per window (default: 100)
 * @param {string} options.message - Error message when limit exceeded
 * @param {function} options.keyGenerator - Custom key generator (req) => string
 */
export const rateLimiter = ({
    windowMs = 60000,
    max = 100,
    message = 'Too many requests, please try again later.',
    keyGenerator = null,
} = {}) => {
    const windowSeconds = Math.ceil(windowMs / 1000);

    return async (req, res, next) => {
        try {
            const key = keyGenerator
                ? keyGenerator(req)
                : `rl:${req.ip}:${req.baseUrl}`;

            const current = await redisClient.incr(key);

            // Set expiry only on first request in the window
            if (current === 1) {
                await redisClient.expire(key, windowSeconds);
            }

            // Set rate limit headers
            const ttl = await redisClient.ttl(key);
            res.set('X-RateLimit-Limit', String(max));
            res.set('X-RateLimit-Remaining', String(Math.max(0, max - current)));
            res.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + ttl));

            if (current > max) {
                return res.status(429).json({ message });
            }

            next();
        } catch (error) {
            console.error('Rate limiter error:', error);
            next(); // Fail open — don't block requests if Redis is down
        }
    };
};

// Preset: Global — 100 req/min per IP
export const globalLimiter = rateLimiter({
    windowMs: 60000,
    max: 100,
    message: 'Too many requests, please try again later.',
});

// Preset: Auth — 10 req/min per IP (login, register)
export const authLimiter = rateLimiter({
    windowMs: 60000,
    max: 10,
    message: 'Too many login attempts, please try again after a minute.',
    keyGenerator: (req) => `rl:auth:${req.ip}`,
});

// Preset: Payment — 5 req/min per user
export const paymentLimiter = rateLimiter({
    windowMs: 60000,
    max: 5,
    message: 'Too many payment requests, please slow down.',
    keyGenerator: (req) => `rl:payment:${req.user?.id || req.ip}`,
});

export default rateLimiter;
