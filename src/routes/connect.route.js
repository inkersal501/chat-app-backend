import express from "express";
import { connectController } from "../controllers/index.js";
const router = express.Router();
  
router.get("/suggestions", connectController.getSuggestions);
router.get("/requests", connectController.getRequests);
router.post("/request/:toUserId" , connectController.sendRequest);
router.post("/accept/:fromUserId", connectController.acceptRequest);
router.get("/friends", connectController.getFriends);
 
export default router; 
