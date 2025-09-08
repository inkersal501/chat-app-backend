import client from "../redisClient.js";

const getFriends = async (req, res, next) => { 
    try {
        const currUserId = req.user._id;
        const cachedData = await client.get(`friends:${currUserId}`);
        if(cachedData){
            console.log("Redis:GET Friends");
            res.json({ list: JSON.parse(cachedData) });
        }else{
            next();
        }
    } catch (error) {
        next(error);
    }
};
export default {getFriends};