import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';
import redisClient from './config/redis.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { orderQueue, notificationQueue, stockQueue } from './queues/index.js';

// Import BullMQ workers (they start automatically on import)
import './queues/orderWorker.js';
import './queues/notificationWorker.js';
import './queues/stockWorker.js';

import authRouter from './routes/authRoute.js';
import uploadRouter from './routes/uploadRoute.js';
import userRouter from './routes/userRoute.js';
import vendorRouter from './routes/vendorRoute.js';
import adminRouter from './routes/adminRoute.js';
import cartRouter from './routes/cartRoute.js';
import productRouter from './routes/productRoute.js';
import categoryRouter from './routes/categoryRoute.js';
import paymentRouter from './routes/paymentRoute.js';
import wishlistRouter from './routes/wishlistRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import refundRouter from './routes/refundRoute.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiter: 100 requests/min per IP
app.use('/api', globalLimiter);

// Basic health check route
app.get('/api/health', async (req, res) => {
    const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';

    const [orderCounts, notifCounts, stockCounts] = await Promise.all([
        orderQueue.getJobCounts(),
        notificationQueue.getJobCounts(),
        stockQueue.getJobCounts(),
    ]);

    res.json({ 
        status: 'ok', 
        message: 'Lumina Backend API is running',
        redis: redisStatus,
        queues: {
            orders: orderCounts,
            notifications: notifCounts,
            stock: stockCounts,
        }
    });
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/vendor', vendorRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/cart', cartRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/refund', refundRouter);

// Sync Database and Start Server
async function startServer() {
    try {
        // Authenticate with MySQL
        await sequelize.authenticate();
        console.log('✅ Database connection has been established successfully.');

        // Use alter:true only when SYNC_ALTER=true (e.g. after model changes)
        // Default: safe sync that only creates missing tables
        const alter = process.env.SYNC_ALTER === 'true';
        await sequelize.sync({ alter });
        console.log(`✅ All database models synced successfully${alter ? ' (alter mode)' : ''}.`);

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        process.exit(1);
    }   
}

startServer();
