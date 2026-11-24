import { messageService } from "../services/index.js";

const getMessages = async (req, res) => { 
    const { chatId } = req.params;
    try {
        const page = await messageService.getMessages(chatId, req.user._id, req.query.before);
        res.json(page);
    } catch (error) {
        res.status(error.statusCode || 500).send({msg: error.statusCode ? error.message : "Unable to process messages."});
    }
};

const sendMessage = async (req, res) => { 
    const { chatId, content, clientId } = req.body;
    const currUserId = req.user._id;
    try {
        const message = await messageService.sendMessage(chatId, currUserId, content, clientId);
        res.json({ message, list: [message] });
    } catch (error) {
        res.status(error.statusCode || 500).send({msg: error.statusCode ? error.message : "Unable to process messages."});
    }
};

export default {
    getMessages,
    sendMessage
};
