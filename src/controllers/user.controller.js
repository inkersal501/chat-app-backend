import { userService } from "../services/index.js"; 

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
        res.json({msg: "SignIn succesfull.", user});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};  

const googleSignIn = async (req, res) => {
    const {idToken} = req.body;
    try {
        const user = await userService.googleSignIn(idToken);   
        res.json({msg: "SignIn succesfull.", user});
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

export default { signUp, signIn, googleSignIn, profile, updateUsername };