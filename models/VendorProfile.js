import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const VendorProfile = sequelize.define('VendorProfile', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    storeName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.TEXT,
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'suspended'),
        defaultValue: 'pending',
    }
}, {
    timestamps: true,
});

export default VendorProfile;
