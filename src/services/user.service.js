import { User as userModel, Login as loginModel, Chat as chatModel } from "../models/index.js"; 
import { tokenService } from "./index.js"; 
import { transporter } from "../config/mailer.js";

const signUp = async (user) => { 
    const emailStatus = await userModel.findOne({email: user.email});
    const userStatus = await userModel.findOne({username: user.username});
    if(emailStatus)
        throw new Error("Email already exists.");
    if(userStatus)
        throw new Error("Username already exists.");
    if(user.password.length<8)
        throw new Error("Signup failed. Password must contain at least 8 characters.");

    try {
        const userData = await userModel.create({...user});
        await chatModel.create({participants: [userData._id], lastMessage: null, isSelfChat: true})
        await transporter.sendMail({
            from: '"ChatApp Support" <inkersal143@gmail.com>',
            to: user.email,
            subject: "Welcome to ChatApp 🎉",
            html: `<h3>Hi ${user.username},</h3><p>Thanks for signing up for ChatApp! 🎉<br/>We're glad to have you!</p>`
        });
        console.log("Welcome Mailto: "+ user.email);
        return true;
    } catch (error) {
        throw new Error(`Signup failed. ${error.message}.`);
    }  

};

const signIn = async (user) => {
    const {email, password} = user;
    if(email == "" || password == ""){
        throw new Error("Email or Password is empty.");
    }else{
        try {
            const getUser = await userModel.findOne({email});
            if(!getUser)
                throw new Error("User not found.");         
            if(getUser && !(await getUser.isPasswordMatch(password)))
                throw new Error("Incorrect password.");            
            const token = await tokenService.generateAuthTokens(getUser);    
            await loginModel.create({email, token})  
            const { username, _id } = getUser; 
            return {_id, username, email, token};
        } catch (error) {
            throw new Error(`SignIn failed. ${error.message}.`);
        }
    }
};

const profile = async (user) => {
    try {
        const getUser = await userModel.findById(user._id).select("username email").lean();
        if(!getUser)
            throw new Error("User not found.");           
        return getUser;
    } catch (error) {
        throw new Error(`${error.message}.`);
    }
};

const updateUsername = async (user, newUsername) => {
  
    const currUser = await userModel.findById(user._id); 
    if(!currUser)
        throw new Error("User not found.");    

    if(newUsername !== currUser.username){
        const userStatus = await userModel.findOne({username: newUsername});
        if(userStatus)
                throw new Error("Username already exists. use other username.");
        try { 
            currUser.username = newUsername;
            await currUser.save();
        } catch (error) {
            throw new Error("Error updating username.");
        }
    } 

    const {_id, username, email} = currUser; 
    return {_id, username, email}; 
    
};

export default { 
    signUp, 
    signIn, 
    profile,
    updateUsername 
};