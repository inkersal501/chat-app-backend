import { requireContactAllowed } from "./privacy.service.js";
import mongoose from "mongoose";
import { Chat as chatModel, Message as messageModel } from "../models/index.js";

const serviceError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const requireChatMember = async (chatId, userId) => {
    if (!mongoose.isValidObjectId(chatId)) {
        throw serviceError("Invalid chat ID.", 400);
    }

    const chat = await chatModel.findOne({ _id: chatId, participants: userId }).select("participants").lean();
    if (!chat) {
        throw serviceError("Chat not found.", 404);
    }
    return chat;
};

const getMessages = async (chatId, userId, before) => {
    await requireChatMember(chatId, userId);

    const filter = { chat: chatId };
    if (before !== undefined) {
        if (typeof before !== "string" || !mongoose.isObjectIdOrHexString(before)) {
            throw serviceError("Invalid history cursor.", 400);
        }
        const cursor = await messageModel.findOne({ _id: before, chat: chatId }).select("createdAt").lean();
        if (!cursor) throw serviceError("History cursor not found.", 404);
        filter.$or = [
            { createdAt: { $lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
        ];
    }

    const pageSize = 100;
    const messages = await messageModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(pageSize + 1)
        .populate("sender", "username")
        .lean();

    const list = messages.slice(0, pageSize).reverse();
    return { list, nextCursor: messages.length > pageSize ? list[0]._id : null };
};

const sendMessage = async (chatId, senderId, content, clientId) => {
    if (clientId !== undefined && (typeof clientId !== "string" || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(clientId))) {
        throw serviceError("Invalid message ID.", 400);
    }
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

    const chat = await requireChatMember(chatId, senderId);
    await Promise.all(chat.participants.map((id) => requireContactAllowed(senderId, id)));

    const fields = { chat: chatId, sender: senderId, content: trimmedContent };
    let message;
    if (clientId === undefined) {
        message = await messageModel.create(fields);
    } else {
        const key = { chat: chatId, sender: senderId, clientId };
        try {
            message = await messageModel.findOneAndUpdate(key, {
                $setOnInsert: { ...fields, createdAt: new Date(), updatedAt: new Date() },
            }, { upsert: true, returnDocument: "after", timestamps: false });
        } catch (error) {
            if (error.code !== 11000) throw error;
            message = await messageModel.findOne(key);
            if (!message) throw error;
        }
        if (message.content !== trimmedContent) throw serviceError("Message ID already used.", 409);
    }

    await chatModel.updateOne({
        _id: chatId,
        $or: [
            { lastMessageAt: null },
            { lastMessageAt: { $lt: message.createdAt } },
            { lastMessageAt: message.createdAt, lastMessage: { $lt: message._id } },
        ],
    }, { $set: { lastMessage: message._id, lastMessageAt: message.createdAt } });

    await message.populate("sender", "username");
    return message;
};

export default {
    getMessages,
    sendMessage,
};
