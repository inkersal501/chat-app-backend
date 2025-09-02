import { Router } from "express";
import { analyticsController } from "../controllers/index.js";
const router = Router();

router.get("/", analyticsController.getData);


export default router;