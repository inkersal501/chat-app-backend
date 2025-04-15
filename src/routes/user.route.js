import express from "express";
const router = express.Router();
import { userController } from "../controllers/index.js"; 
import {authMiddleware} from "../middlewares/index.js";


router.post("/signup", userController.signUp);
router.post("/signin", userController.signIn);
router.post("/profile", authMiddleware, userController.profile);

export default router; 