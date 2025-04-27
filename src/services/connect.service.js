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

    const fromUser = await userModel.findById(fromUserId);
    const currUser = await userModel.findById(currUserId);
  
    if(!currUser.receivedRequests.includes(fromUserId))
        throw new Error("No request found.");
    
    console.log(fromUser.sentRequests)
    fromUser.sentRequests = fromUser.sentRequests.filter((id)=>id!==currUserId);
    currUser.receivedRequests = currUser.receivedRequests.filter((id)=>id!==fromUserId);
    
    fromUser.friends.push(currUserId);
    currUser.friends.push(fromUserId);

    await fromUser.save();
    await currUser.save();

    return true;
};

const getFriends = async (currUserId) => {

    const currUser = await userModel.findById(currUserId).populate("friends", "_id username email");
    return currUser.friends;
    
};

const getSuggestions = async (currUserId) => {
    try {
        const currentUser = await userModel.findById(currUserId);
    
        const excludedUserIds = [
          ...currentUser.friends,
          ...currentUser.sentRequests,
          ...currentUser.receivedRequests,
          currentUser._id
        ];
    
        const suggestedUsers = await userModel.find({
          _id: { $nin: excludedUserIds }
        }).select('_id username email'); 
    
        return suggestedUsers;
    } catch (error) {
        throw new Error("Error fetching suggested users."); 
    }
};

const getRequests = async (currUserId) => {
    try {
        const currentUser = await userModel.findById(currUserId);
    
        const reqUserIds = [ 
          ...currentUser.receivedRequests 
        ];
    
        const reqUsers = await userModel.find({
          _id: { $in: reqUserIds }
        }).select('_id username email'); 
    
        return reqUsers;
    } catch (error) {
        throw new Error("Error fetching requested users."); 
    }
};

export default {
    sendRequest,
    acceptRequest,
    getFriends,
    getSuggestions,
    getRequests 
};