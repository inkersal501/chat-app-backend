import mongoose from "mongoose";   
import { userRef } from "./user.model.js";

const messageSchema = mongoose.Schema(
    {   
        chat: { type : mongoose.Schema.Types.ObjectId, ref: "Chat" },
        sender: userRef,
        clientId: String,
        content: { type: String, required: true, trim: true, maxlength: 4000 },
        messageType: { type: String, enum:["text", "image", "file"], default: "text" },
        attachments: [ { url: String, fileName: String, fileType: String } ],
        readby : [ userRef ]
    },
    { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: -1, _id: -1 });
messageSchema.index({ chat: 1, sender: 1, clientId: 1 }, {
    unique: true,
    partialFilterExpression: { clientId: { $type: "string" } },
});
 
const Message = mongoose.model("Message", messageSchema, "message");
export default Message;