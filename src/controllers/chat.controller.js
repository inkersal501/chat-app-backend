import { chatService } from "../services/index.js";

const getChatList = async (req, res) => {
    const currUserId = req.user._id;
    
        try {
            const list = await chatService.getChatList(currUserId);
            if(list.length > 0)
                res.status(200).send({ list });
            else 
                res.status(500).send({msg: "No chat found."});
        } catch (error) {
            res.status(500).send({msg: error.message});
        }
};

const getMessages = async (req, res) => { 
    const { chatId } = req.params;
    try {
        const list = await chatService.getMessages(chatId);
        res.status(200).send({ list }); 
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

const sendMessage = async (req, res) => { 
    const { chatId } = req.params;
    const currUserId = req.user._id;
    try {
        const list = await chatService.sendMessage(chatId, currUserId);
        res.status(200).send({ list }); 
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

export default {
    getChatList,
    getMessages,
    sendMessage
};