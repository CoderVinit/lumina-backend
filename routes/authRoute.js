import express from "express";
import { RegisterController, LoginController, GetUserProfileController, UpdateUserProfileController, GoogleLoginController } from "../controller/userController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", RegisterController)
router.post("/login", LoginController)
router.post("/google", GoogleLoginController)

router.get("/me", verifyToken, GetUserProfileController);
router.put("/me", verifyToken, UpdateUserProfileController);

export default router;
