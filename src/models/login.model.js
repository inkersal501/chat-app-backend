import mongoose from "mongoose";   

const loginSchema = mongoose.Schema(
    { 
        email: { type: String, required: true, trim: true, lowercase: true },
        token : { type: String, required: true } 
    },
    { timestamps: true }
);
 
const Login = mongoose.model("Login", loginSchema, "login");
export default Login; 