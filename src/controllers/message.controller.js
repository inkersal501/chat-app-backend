import { messageService } from "../services/index.js";

const getMessages = async (req, res) => { 
    const { chatId } = req.params;
    try {
        const list = await messageService.getMessages(chatId);
        res.json({ list }); 
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

const sendMessage = async (req, res) => { 
    const { chatId, content } = req.body;
    const currUserId = req.user._id;
    try {
        const message = await messageService.sendMessage(chatId, currUserId, content);  
        res.json({ message }); 
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

export default {
    getMessages,
    sendMessage
};