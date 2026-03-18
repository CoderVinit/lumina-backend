import { Worker } from 'bullmq';
import { redisConnection } from './index.js';
import emailService from '../services/emailService.js';
import { User } from '../models/index.js';


const notificationWorker = new Worker(
    'notifications',
    async (job) => {
        const { type, userId, data } = job.data;

        try {
            const user = await User.findByPk(userId);
            if (!user) {
                console.error(`❌ User ${userId} not found for notification`);
                return;
            }

            switch (type) {
                case 'order-confirmation': {
                    await emailService.sendTemplate(user.email, 'order-confirmation', {
                        orderId: data.orderId,
                        amount: data.amount,
                    });
                    break;
                }

                case 'payment-received': {
                    await emailService.sendTemplate(user.email, 'payment-received', {
                        orderId: data.orderId,
                        amount: data.amount,
                        paymentId: data.paymentId,
                    });
                    break;
                }

                case 'order-shipped': {
                    await emailService.sendTemplate(user.email, 'order-shipped', {
                        orderId: data.orderId,
                        trackingNumber: data.trackingNumber,
                        deliveryDate: data.deliveryDate,
                    });
                    break;
                }

                case 'order-delivered': {
                    await emailService.sendTemplate(user.email, 'order-delivered', {
                        orderId: data.orderId,
                    });
                    break;
                }

                case 'refund-processed': {
                    console.log(`💸 Refund notification for order #${data.orderId} to ${user.email}`);
                    break;
                }

                case 'welcome': {
                    await emailService.sendTemplate(user.email, 'welcome', {});
                    break;
                }

                case 'password-reset': {
                    await emailService.sendTemplate(user.email, 'password-reset', {
                        resetCode: data.resetCode,
                    });
                    break;
                }

                default:
                    console.log(`Unknown notification type: ${type}`);
            }
        } catch (error) {
            console.error(`❌ Notification failed for user ${userId}:`, error);
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 10,
    }
);

notificationWorker.on('completed', (job) => {
    console.log(`✅ Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
    console.error(`❌ Notification job ${job?.id} failed:`, err.message);
});

export default notificationWorker;
