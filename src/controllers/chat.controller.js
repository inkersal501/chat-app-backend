import { chatService } from "../services/index.js";

const getChatList = async (req, res) => { 
    const currUserId = req.user._id; 
    try {
        const list = await chatService.getChatList(currUserId);
        if(list.length > 0)
            res.json({ list });
        else 
            res.status(500).send({msg: "No chat found."});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};


export default {
    getChatList
};