import { User as userModel } from "../models/index.js"; 

const sendRequest = async (currUserId, toUserId) => {

    const currUser = await userModel.findById(currUserId);
    const toUser = await userModel.findById(toUserId);

    if(!currUser || !toUser)
        throw new Error("User not found.");
    if(currUser.friends.includes(toUserId))
        throw new Error("Already friends.");
    if(currUser.sentRequests.includes(toUserId))
        throw new Error("Request already sent.");
    
    currUser.sentRequests.push(toUserId);
    toUser.receivedRequests.push(currUserId);

    await currUser.save();
    await toUser.save();

    return true;

};

const acceptRequest = async (fromUserId, currUserId) => {

    const fromUser = await userModel.findById(fromuserId);
    const currUser = await userModel.findById(currUserId);
  
    if(!currUser.receivedRequests.includes(fromuserId))
        throw new Error("No request found.");
    
    fromUser.sentRequests = fromUser.sentRequests.filter((id)=>id!==currUserId);
    currUser.receivedRequests = currUser.receivedRequests.filter((id)=>id!==fromuserId);
    
    fromUser.friends.push(currUserId);
    currUser.friends.push(fromuserId);

    await fromUser.save();
    await currUser.save();

    return true;
};

const getFriends = async (currUserId) => {

    const currUser = await User.findById(userId).populate("friends", "username email");
    return currUser.friends;
    
};

export default {
    sendRequest,
    acceptRequest,
    getFriends 
};