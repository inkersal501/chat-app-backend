import {Router} from "express";
import { chatController } from "../controllers/index.js";
const router = Router();
 
router.get("/chatlist", chatController.getChatList);


export default router;