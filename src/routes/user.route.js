import express from "express";
import { userController } from "../controllers/index.js"; 
import { authMiddleware } from "../middlewares/index.js";
const router = express.Router();

router.post("/signup", userController.signUp);
router.post("/signin", userController.signIn);
router.post("/profile", authMiddleware, userController.profile);
router.patch("/username", authMiddleware, userController.updateUsername);

export default router; 