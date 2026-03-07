export const requireVendor = (req, res, next) => {
    if (req.user?.role !== 'vendor') {
        return res.status(403).json({ message: 'Access denied. Vendor account required.' });
    }
    next();
};
