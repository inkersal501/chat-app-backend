import { userService } from "../services/index.js"; 
import config from "../config/config.js";

const signUp = async (req, res) => {
    try { 
        const result = await userService.signUp(req.body);   
        res.status(201).send({msg: "Signup successfull."});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }  
};

const signIn = async (req, res) => {
    try {
        const user = await userService.signIn(req.body);  
       
        res.cookie("token", user.token, {
            httpOnly: true,              
            secure: config.node_env === "production",
            sameSite: config.node_env === "production"?"none": "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000      
        });

        res.json({msg: "SignIn succesfull.", user: user.details});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};  

const googleSignIn = async (req, res) => {
    const {idToken} = req.body;
    try {
        const user = await userService.googleSignIn(idToken);   

        res.cookie("token", user.token, {
            httpOnly: true,              
            secure: config.node_env === "production",
            sameSite: config.node_env === "production"?"none": "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000           
        });
        
        res.json({msg: "SignIn succesfull.", user: user.details});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

const profile = async (req, res) => {
    try {
        const user = await userService.profile(req.user);   
        res.json({msg: "Profile fetch succesfull.", user});
    } catch (error) {
        res.status(500).send({msg: error.message});
    } 
};
const updateUsername = async (req, res) => {
    try {       
        const user = await userService.updateUsername(req.user, req.body.username);
        res.json({msg: "Username updated", user});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

const getSessUser = async (req, res) => {
    try {        
        const user = await userService.getSessUser(req.user._id);
        res.json({user});
    } catch (error) {
        res.status(500).send({msg: error.message});
    } 
};

const logout = async (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: config.node_env === "production"?"none": "lax",
    });
  return res.json({ message: "Logged out successfully" });
};

export default { signUp, signIn, googleSignIn, profile, updateUsername, getSessUser, logout };