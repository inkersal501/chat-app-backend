import mongoose from "mongoose";   
import { userRef } from "./user.model.js";
 
const chatSchema = mongoose.Schema(
    { 
        participants: [ userRef ],
        lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
        lastMessageAt : { type: Date, default: Date.now },
        isSelfChat : { type: Boolean, default: false }
    },
    { timestamps: true }
);
 
const Chat = mongoose.model("Chat", chatSchema, "chat");
export default Chat; 