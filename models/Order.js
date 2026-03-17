import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    shippingAddress: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'failed'),
        defaultValue: 'pending',
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending',
    },
    returnStatus: {
        type: DataTypes.ENUM('none', 'requested', 'approved', 'rejected'),
        defaultValue: 'none',
    },
    returnReason: {
        type: DataTypes.ENUM('damaged', 'wrong_product', 'other'),
        allowNull: true,
    },
    returnDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    returnRejectedReason: {
        type: DataTypes.TEXT,
        allowNull: true,
    }
}, {
    timestamps: true,
});

export default Order;
