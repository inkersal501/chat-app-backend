import express from "express";
import { chatController } from "../controllers/index.js";
const router = express.Router();

router.get("/chatlist", chatController.getChatList);
router.get("/:chatId/messages", chatController.getMessages);
router.post("/:chatId/sendmessage", chatController.sendMessage);
export default router;