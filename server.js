import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';
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

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Lumina Backend API is running' });
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

        await sequelize.sync({ alter: true });
        console.log('✅ All database models synced successfully.');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        process.exit(1);
    }   
}

startServer();
