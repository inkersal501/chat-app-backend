import {Router} from "express";
import { messageController } from "../controllers/index.js";
const router = Router();
 
router.get("/:chatId", messageController.getMessages); 
router.post("/send", messageController.sendMessage);

export default router;