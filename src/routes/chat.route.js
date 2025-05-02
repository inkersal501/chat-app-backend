import express from "express";
import { chatController } from "../controllers/index.js";
const router = express.Router();

router.get("/chatlist", chatController.getChatList);

export default router;