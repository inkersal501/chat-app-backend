import { Chat as chatModel, User as userModel , Message as messageModel} from "../models/index.js";

const getChatList = async (currUserId) => {
    
    try {     
        const chats = await chatModel.find({participants: currUserId})
        .populate({
            path: "participants",
            select: "_id username email",
            match: { _id: { $ne: currUserId } }
        })
        .populate({
            path: "lastMessage",
            populate: {
            path: "sender",
            select: "_id username"
            }
        })
        .sort({ updatedAt: -1 }); 
        return chats;
    } catch (error) {
        throw new Error("Error fetching chats."); 
    }    
    
};

 
export default {
    getChatList 
};