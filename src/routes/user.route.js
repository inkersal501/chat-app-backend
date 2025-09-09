import {Router} from "express";
import { userController } from "../controllers/index.js"; 
import { authMiddleware } from "../middlewares/index.js";
const router = Router();

router.post("/signup", userController.signUp);
router.post("/signin", userController.signIn);
router.post("/google_signin", userController.googleSignIn);

router.use(authMiddleware);
router.get("/me", userController.getSessUser);
router.post("/profile", userController.profile);
router.patch("/username", userController.updateUsername);

export default router; 