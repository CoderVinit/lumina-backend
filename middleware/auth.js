import jwt from "jsonwebtoken";



const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "You are not authenticated!" })
        }
        const decode = await jwt.verify(token, process.env.JWT_SECRET);
        req.user = decode;
        next();

    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}


export { verifyToken };
