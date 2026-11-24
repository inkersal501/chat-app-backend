import { limitRequests } from "../middlewares/quota.middleware.js";
import {Router} from "express";
import { messageController } from "../controllers/index.js";
const router = Router();
 
router.get("/:chatId", messageController.getMessages); 
router.post("/send", limitRequests("message-send", 120), messageController.sendMessage);

export default router;