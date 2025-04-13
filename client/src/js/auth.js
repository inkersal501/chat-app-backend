import axios from "axios";
import apiEndpoint from "./config";
import { toast } from "react-toastify";
const signIn = async (req)=>{ 
    try {
        const result = await axios.post(`${apiEndpoint}/user/signin`, {email: req.email, password: req.password});
        if(result.status === 200){
            toast.success(result.data.msg);
            return true;
        }            
    } catch (error) {  
        toast.error(error.response.data.msg);
        return false;
    }
};

const signUp = async (req) => {
    try {
        const result = await axios.post(`${apiEndpoint}/user/signup`, {...req}); 
        if(result.status === 201){
            toast.success(result.data.msg);
            return true;
        }            
    } catch (error) {
        toast.error(error.response.data.msg);
        return false;
    }
};
export default { signIn, signUp };