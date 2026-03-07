import { User } from '../models/index.js';

export const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admin role required." });
        }

        next();
    } catch (error) {
        console.error("Require Admin Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
