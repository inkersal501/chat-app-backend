import { connectService } from "../services/index.js";

const sendRequest = async (req, res) => {

    const currUserId = req.user._id;
    const toUserId = req.params.toUserId;

    if(currUserId.toString()===toUserId){
        res.status(500).send({msg: "Cannot send request to yourself"});
    }else{
        try {
            const status = await connectService.sendRequest(currUserId, toUserId);
            if(status)
                res.status(200).send({msg: "Friend request sent."});
        } catch (error) {
            res.status(500).send({msg: error.message});
        }
        
    }

};

const acceptRequest = async (req, res) => {

    const currUserId = req.user._id;
    const fromUserId = req.params.fromUserId;

    try {
        const status = await connectService.acceptRequest(fromUserId, currUserId);
        if(status)
            res.status(200).send({msg: "Friend request accepted."});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }

};
const declineRequest = async (req, res) => {

    const currUserId = req.user._id;
    const fromUserId = req.params.fromUserId;

    try {
        const status = await connectService.declineRequest(fromUserId, currUserId);
        if(status)
            res.status(200).send({msg: "Friend request declined."});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }

};

const getFriends = async (req, res) => {

    const currUserId = req.user._id;

    try {
        const list = await connectService.getFriends(currUserId);
        if(list.length > 0)
            res.status(200).send({ list });
        else 
            res.status(500).send({msg: "No friends found."});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }

};

const getSuggestions = async (req, res) => {
    const currUserId = req.user._id;

    try {
        const list = await connectService.getSuggestions(currUserId);
        if(list.length > 0)
            res.status(200).send({ list });
        else 
            res.status(500).send({msg: "No users found."});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

const getRequests = async (req, res) => {
    const currUserId = req.user._id;

    try {
        const list = await connectService.getRequests(currUserId);
        if(list.length > 0)
            res.status(200).send({ list });
        else 
            res.status(500).send({msg: "No requests found."});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

export default {
    sendRequest,
    acceptRequest,
    declineRequest,
    getFriends,
    getSuggestions,
    getRequests
};