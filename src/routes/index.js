import userRoute from "./user.route.js";
import connectRoute from "./connect.route.js";
import chatRoute  from "./chat.route.js";
import { authMiddleware } from "../middlewares/index.js";

export default function v1routes(app) {    
    app.use((req, res, next) => { 
        console.log(`${req.method} ${req.originalUrl}`); 
        next();
    });
    
    app.use("/v1/user", userRoute);
    app.use("/v1/connect", authMiddleware, connectRoute);
    app.use("/v1/chat", authMiddleware, chatRoute);
} 