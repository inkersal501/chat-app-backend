import mongoose from "mongoose";   
import { userRef } from "./user.model.js";

const messageSchema = mongoose.Schema(
    {   
        chat: { type : mongoose.Schema.Types.ObjectId, ref: "Chat" },
        sender: userRef,
        content: { type: String, required: true, trim: true, maxlength: 4000 },
        messageType: { type: String, enum:["text", "image", "file"], default: "text" },
        attachments: [ { url: String, fileName: String, fileType: String } ],
        readby : [ userRef ]
    },
    { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: 1 });
 
const Message = mongoose.model("Message", messageSchema, "message");
export default Message;