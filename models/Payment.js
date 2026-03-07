import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    razorpayOrderId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    razorpayPaymentId: {
        type: DataTypes.STRING,
        comment: 'Populated after successful payment completion',
    },
    razorpaySignature: {
        type: DataTypes.STRING,
        comment: 'Used to verify Webhook/Frontend success payload',
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('created', 'authorized', 'captured', 'refunded', 'failed'),
        defaultValue: 'created',
    }
}, {
    timestamps: true,
});

export default Payment;
