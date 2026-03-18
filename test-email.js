import emailService from './services/emailService.js';

// Test email functionality
async function testEmail() {
    try {
        console.log('🧪 Testing email service...');

        // Test welcome email
        await emailService.sendTemplate('test@example.com', 'welcome', {});

        // Test order confirmation
        await emailService.sendTemplate('test@example.com', 'order-confirmation', {
            orderId: 'TEST-123',
            amount: 2999,
        });

        console.log('✅ All test emails sent successfully!');
    } catch (error) {
        console.error('❌ Email test failed:', error);
    }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testEmail();
}

export default testEmail;