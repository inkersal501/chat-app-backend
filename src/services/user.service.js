import { User as userModel, Login as loginModel} from "../models/index.js"; 
import { tokenService } from "./index.js"; 
import { transporter } from '../config/mailer.js';

const signUp = async (user) => { 
    const emailStatus = await userModel.findOne({email: user.email});
    if(!emailStatus) {
        if(user.password.length<8){
            throw new Error("Signup Failed. Password must contain at least 8 characters.");
        }else{
            try {
                await userModel.create({...user});
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
        }     
    }else{
        throw new Error("Email already exists.");
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
                throw new Error('User Not Found.');         
            if(getUser && !(await getUser.isPasswordMatch(password)))
                throw new Error('Incorrect Password.');            
            const token = await tokenService.generateAuthTokens(getUser);    
            await loginModel.create({email, token})         
            return token;
        } catch (error) {
            throw new Error(`SignIn Failed. ${error.message}.`);
        }
    }
};

const profile = async (user) => {
    try {
        const getUser = await userModel.findById(user._id).select('username email').lean();
        if(!getUser)
            throw new Error('User Not Found.');           
        return getUser;
    } catch (error) {
        throw new Error(`${error.message}.`);
    }
};

export default { signUp, signIn, profile };