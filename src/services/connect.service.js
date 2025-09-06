import { Chat as chatModel, User as userModel } from "../models/index.js"; 
 
const sendRequest = async (currUserId, toUserId) => {

    try {       
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
    }catch (error) {
        throw new Error("Error sending request.");  
    }

};

const acceptRequest = async (fromUserId, currUserId) => {

    try {       
        const fromUser = await userModel.findById(fromUserId);
        const currUser = await userModel.findById(currUserId);
    
        if(!currUser.receivedRequests.includes(fromUserId))
            throw new Error("No request found.");
        
        fromUser.sentRequests = fromUser.sentRequests.filter((id)=>id.toString()!==currUserId.toString());
        currUser.receivedRequests = currUser.receivedRequests.filter((id)=>id.toString()!==fromUserId.toString());
        
        fromUser.friends.push(currUserId);
        currUser.friends.push(fromUserId);

        await fromUser.save();
        await currUser.save(); 

        const isExistingChat = await chatModel.findOne({
            participants: { $all: [fromUserId, currUserId], $size: 2 }
        });
        if(!isExistingChat) {
            await chatModel.create({participants: [fromUserId, currUserId], lastMessage: null})
        }    

        return true;
    } catch (error) {
        throw new Error("Error accepting request.");  
    }

};

const declineRequest = async (fromUserId, currUserId) => {
    
    try {       
        const fromUser = await userModel.findById(fromUserId);
        const currUser = await userModel.findById(currUserId);
    
        if(!currUser.receivedRequests.includes(fromUserId))
            throw new Error("No request found.");
        
        fromUser.sentRequests = fromUser.sentRequests.filter((id)=>id.toString()!==currUserId.toString());
        currUser.receivedRequests = currUser.receivedRequests.filter((id)=>id.toString()!==fromUserId.toString());

        await fromUser.save();
        await currUser.save(); 

        return true;
    } catch (error) {
        throw new Error("Error declining request.");  
    }
};


const getFriends = async (currUserId) => {

    try {       
        const currUser = await userModel.findById(currUserId).populate("friends", "_id username email"); 
        if (!currUser) throw new Error("User not found");

        const friendIds = currUser.friends.map((f) => f._id);
        const chats = await chatModel.find({participants: { $in: friendIds, $all: [currUserId] } });
        const chatMap = new Map();
        chats.forEach((chat) => {
            const otherId = chat.participants.find(
                (id) => id.toString() !== currUserId.toString()
            );
            if (otherId) {
                chatMap.set(otherId.toString(), chat._id);
            }
        });

        const friends = currUser.friends.map((friend) => ({
            _id: friend._id,
            username: friend.username,
            email: friend.email,
            chatId: chatMap.get(friend._id.toString()) || null,
        }));        
         
        return friends;
    } catch (error) {
        throw new Error("Error fetching friends."); 
    }  
      
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
        }).select('_id username'); 
    
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
    declineRequest,
    getFriends,
    getSuggestions,
    getRequests 
};