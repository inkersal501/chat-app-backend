import express from "express";
import { messageController } from "../controllers/index.js";
const router = express.Router();
 
router.get("/:chatId", messageController.getMessages); 
router.post("/send", messageController.sendMessage);

export default router;