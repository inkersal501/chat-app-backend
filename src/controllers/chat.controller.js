import { chatService } from "../services/index.js";

const getChatList = async (req, res) => { 
    const currUserId = req.user._id; 
    try {
        const list = await chatService.getChatList(currUserId);
        res.json({ list });
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};


export default {
    getChatList
};
