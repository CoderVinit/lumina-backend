import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP connection failed:', error);
    } else {
        console.log('✅ SMTP server is ready to send emails');
    }
});

// ─── Email Templates ────────────────────────────────────
const templates = {
    'order-confirmation': (data) => ({
        subject: `Order Confirmed - #${data.orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Order Confirmed!</h1>
                <p>Thank you for your order. Your order #${data.orderId} has been confirmed.</p>
                <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                    <h3>Order Details:</h3>
                    <p><strong>Order ID:</strong> ${data.orderId}</p>
                    <p><strong>Total Amount:</strong> ₹${data.amount}</p>
                    <p><strong>Status:</strong> Processing</p>
                </div>
                <p>You will receive updates on your order status via email.</p>
                <p>Thank you for shopping with Lumina!</p>
            </div>
        `,
    }),

    'payment-received': (data) => ({
        subject: `Payment Received - Order #${data.orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #28a745;">Payment Received!</h1>
                <p>We have received your payment for order #${data.orderId}.</p>
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0;">
                    <p><strong>Amount Paid:</strong> ₹${data.amount}</p>
                    <p><strong>Payment ID:</strong> ${data.paymentId}</p>
                </div>
                <p>Your order is now being processed.</p>
            </div>
        `,
    }),

    'order-shipped': (data) => ({
        subject: `Order Shipped - #${data.orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #007bff;">Order Shipped!</h1>
                <p>Great news! Your order #${data.orderId} has been shipped.</p>
                <div style="background: #e3f2fd; padding: 20px; margin: 20px 0;">
                    <p><strong>Tracking Number:</strong> ${data.trackingNumber || 'Will be updated soon'}</p>
                    <p><strong>Expected Delivery:</strong> ${data.deliveryDate || '3-5 business days'}</p>
                </div>
                <p>You can track your order in your account dashboard.</p>
            </div>
        `,
    }),

    'order-delivered': (data) => ({
        subject: `Order Delivered - #${data.orderId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #28a745;">Order Delivered!</h1>
                <p>Your order #${data.orderId} has been delivered successfully.</p>
                <div style="background: #d4edda; padding: 20px; margin: 20px 0;">
                    <p>We hope you enjoy your purchase!</p>
                    <p>If you have any issues, please contact our support team.</p>
                </div>
                <p>Thank you for shopping with Lumina!</p>
            </div>
        `,
    }),

    'welcome': (data) => ({
        subject: 'Welcome to Lumina!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Welcome to Lumina!</h1>
                <p>Thank you for joining Lumina. We're excited to have you as part of our community.</p>
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0;">
                    <h3>What's next?</h3>
                    <ul>
                        <li>Browse our latest products</li>
                        <li>Set up your wishlist</li>
                        <li>Complete your profile</li>
                    </ul>
                </div>
                <p>Happy shopping!</p>
                <p>The Lumina Team</p>
            </div>
        `,
    }),

    'password-reset': (data) => ({
        subject: 'Reset Your Password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc3545;">Password Reset Request</h1>
                <p>You requested a password reset for your Lumina account.</p>
                <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p><strong>Reset Code:</strong> ${data.resetCode}</p>
                    <p>This code will expire in 15 minutes.</p>
                </div>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `,
    }),
};

// ─── Email Service ──────────────────────────────────────
export const emailService = {
  
    async sendTemplate(to, template, data, options = {}) {
        try {
            if (!templates[template]) {
                throw new Error(`Template '${template}' not found`);
            }

            const templateData = templates[template](data);
            const mailOptions = {
                from: `"Lumina" <${process.env.SMTP_USER}>`,
                to,
                subject: templateData.subject,
                html: templateData.html,
                ...options,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`📧 Email sent: ${template} to ${to} - ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Email failed: ${template} to ${to}`, error);
            throw error;
        }
    },

    /**
     * Send custom email
     * @param {object} options - Mail options
     */
    async send(options) {
        try {
            const mailOptions = {
                from: `"Lumina" <${process.env.SMTP_USER}>`,
                ...options,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`📧 Custom email sent to ${options.to} - ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Custom email failed to ${options.to}`, error);
            throw error;
        }
    },
};

export default emailService;
