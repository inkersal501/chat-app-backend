import { limitRequests } from "../middlewares/quota.middleware.js";
import {Router} from "express";
import { connectController } from "../controllers/index.js";
// import {cacheMiddleware} from "../middlewares/index.js";
const router = Router();
  
router.get("/suggestions", limitRequests("discovery", 60), connectController.getSuggestions);
router.get("/requests", connectController.getRequests);
router.post("/request/:toUserId", limitRequests("friend-request", 20), connectController.sendRequest);
router.post("/accept/:fromUserId", connectController.acceptRequest);
router.post("/decline/:fromUserId", connectController.declineRequest);
// router.get("/friends", cacheMiddleware.getFriends, connectController.getFriends);
router.get("/friends", connectController.getFriends);
 
export default router; 
