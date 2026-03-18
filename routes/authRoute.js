import express from "express";
import { RegisterController, LoginController, GetUserProfileController, UpdateUserProfileController, GoogleLoginController } from "../controller/userController.js";
import { verifyToken } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", authLimiter, RegisterController)
router.post("/login", authLimiter, LoginController)
router.post("/google", authLimiter, GoogleLoginController)

router.get("/me", verifyToken, GetUserProfileController);
router.put("/me", verifyToken, UpdateUserProfileController);

export default router;
