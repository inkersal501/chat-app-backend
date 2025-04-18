import { userService } from "../services/index.js"; 
const signUp = async (req, res) => {
    try { 
        const result = await userService.signUp(req.body);   
        res.status(201).send({"msg": "Signup successfull."});
    } catch (error) {
        res.status(500).send({"msg": error.message});
    }  
};

const signIn = async (req, res) => {
    try {
        const result = await userService.signIn(req.body);   
        res.status(200).send({"msg": "SignIn succesfull.", token: result});
    } catch (error) {
        res.status(500).send({"msg": error.message});
    }
};  

const profile = async (req, res) => {
    try {
        const result = await userService.profile(req.user);   
        res.status(200).send({"msg": "Profile Fetch succesfull.", user: {...result}});
    } catch (error) {
        res.status(500).send({"msg": error.message});
    } 
};
export default { signUp, signIn, profile };