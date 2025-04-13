import userRoute from "./user.route.js";

export default function v1routes(app) {    
    app.use((req, res, next) => { 
        console.log(`${req.method} ${req.originalUrl}`);
        next();
    });
    app.use("/v1/user", userRoute);
} 