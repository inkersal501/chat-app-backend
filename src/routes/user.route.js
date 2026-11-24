import { limitRequests } from "../middlewares/quota.middleware.js";
import {Router} from "express";
import { userController } from "../controllers/index.js"; 
import { authMiddleware } from "../middlewares/index.js";
const router = Router();

const authQuotaKey = (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase().slice(0, 254) : "";
    return `${req.ip}:${email}`;
};
router.use(["/signup", "/signin", "/google_signin"], limitRequests("auth-traffic", 120, (req) => req.ip));
router.use(["/signup", "/signin"], limitRequests("auth-attempt", 15, authQuotaKey));

router.post("/signup", userController.signUp);
router.post("/signin", userController.signIn);
router.post("/google_signin", userController.googleSignIn);

router.use(authMiddleware);
router.get("/me", userController.getSessUser);
router.post("/profile", userController.profile);
router.patch("/username", userController.updateUsername);
router.post("/logout", userController.logout);
export default router; 