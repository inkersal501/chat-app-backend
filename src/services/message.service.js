import { Chat as chatModel, Message as messageModel} from "../models/index.js";

const getMessages = async (chatId) => {
    try {     
        const messages = await messageModel.find({ chat: chatId }).populate("sender", "username");
        return messages;
    } catch (error) {
        throw new Error("Error fetching messages."); 
    }        
};

const sendMessage = async (chat, sender, content) => { 
    
    try {
        const message = await messageModel.create({
            chat, sender, content
        }); 

        await chatModel.findByIdAndUpdate(chat, {
            lastMessage: message._id,
            lastMessageAt: Date.now()
        });
        return message;
    } catch (error) {
        throw new Error("Error sending message right now."); 
    }
};

export default {    
    getMessages,
    sendMessage
};