import mongoose from "mongoose";
import { Chat as chatModel, Message as messageModel } from "../models/index.js";

const serviceError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const requireChatMember = async (chatId, userId) => {
    if (!mongoose.isValidObjectId(chatId)) {
        throw serviceError("Invalid chat ID.", 400);
    }

    const chat = await chatModel.findOne({ _id: chatId, participants: userId }).select("_id").lean();
    if (!chat) {
        throw serviceError("Chat not found.", 404);
    }
    return chat;
};

const getMessages = async (chatId, userId) => {
    await requireChatMember(chatId, userId);

    const messages = await messageModel.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("sender", "username")
        .lean();

    return messages.reverse();
};

const sendMessage = async (chatId, senderId, content) => {
    if (!mongoose.isValidObjectId(chatId)) {
        throw serviceError("Invalid chat ID.", 400);
    }
    if (typeof content !== "string" || !content.trim()) {
        throw serviceError("Message cannot be empty.", 400);
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length > 4000) {
        throw serviceError("Messages must be 4,000 characters or fewer.", 400);
    }

    await requireChatMember(chatId, senderId);

    const message = await messageModel.create({
        chat: chatId,
        sender: senderId,
        content: trimmedContent,
    });

    await chatModel.findByIdAndUpdate(chatId, {
        $set: { lastMessage: message._id, lastMessageAt: message.createdAt },
    });

    await message.populate("sender", "username");
    return message;
};

export default {
    getMessages,
    sendMessage,
};
