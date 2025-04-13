import express from "express";
const router = express.Router();
import { userController } from "../controllers/index.js";

router.post("/signup", userController.signUp);
router.post("/signin", userController.signIn);

export default router; 