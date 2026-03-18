import Address from '../models/Address.js';
import User from "../models/User.js";
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import bcrypt from "bcryptjs";
import { createToken } from "../middleware/createToken.js";
import { OAuth2Client } from "google-auth-library";
import { notificationQueue } from '../queues/index.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const RegisterController = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "Please fill all fields" })
        }
        const users = await User.findOne({ where: { email } })
        if (users) {
            return res.status(400).json({ message: "User already exists" })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ ...req.body, passwordHash: hashedPassword });
        const token = createToken(user);

        const userData = user.toJSON();
        delete userData.passwordHash;

        // Send welcome email (async, non-blocking)
        await notificationQueue.add('welcome-email', {
            type: 'welcome',
            userId: user.id,
            data: {},
        });

        return res.status(201).json({ message: "User registered successfully", token, user: userData })
    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Internal server error" })
    }
}


export const LoginController = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Please fill all fields" })
        }
        const user = await User.findOne({ where: { email } })
        if (!user) {
            return res.status(400).json({ message: "User not found" })
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" })
        }
        const token = createToken(user);

        const userData = user.toJSON();
        delete userData.passwordHash;

        return res.status(200).json({ message: "User logged in successfully", token, user: userData })
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal server error" })
    }
}


export const GetUserProfileController = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['passwordHash'] }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error("Get Profile Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const UpdateUserProfileController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, email, avatarUrl } = req.body;

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if email is already taken by someone else
        if (email && email !== user.email) {
            const existingEmailUser = await User.findOne({ where: { email } });
            if (existingEmailUser) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        // Update user fields
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (email !== undefined) user.email = email;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

        await user.save();

        const updatedUser = user.toJSON();
        delete updatedUser.passwordHash;

        return res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Update Profile Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const GoogleLoginController = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: "Google credential is required" });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, given_name, family_name, picture } = payload;

        let user = await User.findOne({ where: { googleId } });

        if (!user) {
            user = await User.findOne({ where: { email } });
            if (user) {
                user.googleId = googleId;
                if (!user.avatarUrl && picture) user.avatarUrl = picture;
                await user.save();
            } else {
                user = await User.create({
                    email,
                    googleId,
                    firstName: given_name || '',
                    lastName: family_name || '',
                    avatarUrl: picture || null,
                });
            }
        }

        const token = createToken(user);
        const userData = user.toJSON();
        delete userData.passwordHash;

        return res.status(200).json({ message: "Google login successful", token, user: userData });
    } catch (error) {
        console.error("Google Login Error:", error);
        return res.status(500).json({ message: "Google authentication failed" });
    }
}


export const CreateAddressController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, name, phone, addressLine1, addressLine2, city, state, zip, country, isDefault } = req.body;

        // Validation
        if (!name || !phone || !addressLine1 || !city || !state || !zip || !country) {
            return res.status(400).json({ message: "Please fill all required fields" });
        }

        // If this new address is default, we need to unset any existing default address
        if (isDefault) {
            await Address.update({ isDefault: false }, { where: { userId, isDefault: true } });
        }

        // Create the address
        const newAddress = await Address.create({
            userId,
            type,
            name,
            phone,
            addressLine1,
            addressLine2,
            city,
            state,
            zip,
            country,
            isDefault: isDefault || false
        });

        // If this is the user's first address, naturally make it default
        if (!isDefault) {
            const addressCount = await Address.count({ where: { userId } });
            if (addressCount === 1) { // 1 because we just created it
                newAddress.isDefault = true;
                await newAddress.save();
            }
        }

        res.status(201).json({ message: "Address created successfully", address: newAddress });
    } catch (error) {
        console.error("Create Address Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const GetAddressesController = async (req, res) => {
    try {
        const userId = req.user.id;
        const addresses = await Address.findAll({
            where: { userId },
            order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
        });

        res.status(200).json({ addresses });
    } catch (error) {
        console.error("Get Addresses Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const UpdateAddressController = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id;
        const { type, name, phone, addressLine1, addressLine2, city, state, zip, country, isDefault } = req.body;

        const address = await Address.findOne({ where: { id: addressId, userId } });
        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }

        if (isDefault && !address.isDefault) {
            await Address.update({ isDefault: false }, { where: { userId, isDefault: true } });
        }

        await address.update({
            type,
            name,
            phone,
            addressLine1,
            addressLine2,
            city,
            state,
            zip,
            country,
            isDefault: isDefault !== undefined ? isDefault : address.isDefault
        });

        res.status(200).json({ message: "Address updated successfully", address });
    } catch (error) {
        console.error("Update Address Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const DeleteAddressController = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id;

        const address = await Address.findOne({ where: { id: addressId, userId } });
        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }

        const wasDefault = address.isDefault;
        await address.destroy();

        // If we deleted the default address, we should randomly assign a new default if other addresses exist
        if (wasDefault) {
            const remainingAddress = await Address.findOne({ where: { userId } });
            if (remainingAddress) {
                remainingAddress.isDefault = true;
                await remainingAddress.save();
            }
        }

        res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
        console.error("Delete Address Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const GetUserOrdersController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status } = req.query;
        const parsedPage = Number(page) || 1;
        const parsedLimit = Number(limit) || 20;
        const offset = (parsedPage - 1) * parsedLimit;

        const where = { customerId: userId };
        if (status) {
            where.status = status;
        }

        const { count, rows: orders } = await Order.findAndCountAll({
            where,
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl', 'price'] }],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: parsedLimit,
            offset,
            distinct: true,
        });

        return res.status(200).json({
            orders,
            pagination: {
                total: count,
                page: parsedPage,
                pages: Math.ceil(count / parsedLimit),
            },
        });
    } catch (error) {
        console.error('Get User Orders Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
