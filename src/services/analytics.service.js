import {User as userModel} from "../models/index.js";
const getData = async (userId) => {
    try {
        const user = await userModel.findById(userId).select("friends receivedRequests");
        if(!user)
            throw new Error("Error fetching user details."); 
        const {friends, receivedRequests} = user;
        const data = {friends : friends.length, requests: receivedRequests.length};
        return data;
    } catch (error) {
        throw new Error("Error fetching details."); 
    }
};

export default {
    getData
};