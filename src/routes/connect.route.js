import {Router} from "express";
import { connectController } from "../controllers/index.js";
import {cacheMiddleware} from "../middlewares/index.js";
const router = Router();
  
router.get("/suggestions", connectController.getSuggestions);
router.get("/requests", connectController.getRequests);
router.post("/request/:toUserId" , connectController.sendRequest);
router.post("/accept/:fromUserId", connectController.acceptRequest);
router.post("/decline/:fromUserId", connectController.declineRequest);
router.get("/friends", cacheMiddleware.getFriends, connectController.getFriends);
 
export default router; 
