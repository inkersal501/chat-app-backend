import express from "express";
import { connectController } from "../controllers/index.js";
const router = express.Router();
  
router.post("/request/:toUserId" , connectController.sendRequest);
router.post("/accept/:fromUserId", connectController.acceptRequest);
router.get("/friends", connectController.getFriends);
 
export default router; 
