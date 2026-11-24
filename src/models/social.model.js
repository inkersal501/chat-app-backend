import mongoose from "mongoose";
import { userRef } from "./user.model.js";

const group = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 80 },
    owner: { ...userRef, required: true },
    admins: [userRef],
    members: [userRef],
    invited: [userRef],
}, { timestamps: true });
group.index({ members: 1 });
group.index({ invited: 1 });

const post = new mongoose.Schema({
    author: { ...userRef, required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "SocialGroup", default: null },
    text: { type: String, required: true, maxlength: 4000 },
}, { timestamps: true });
post.index({ group: 1, author: 1, _id: -1 });

const comment = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: "SocialPost", required: true },
    author: { ...userRef, required: true },
    text: { type: String, required: true, maxlength: 2000 },
}, { timestamps: true });
comment.index({ post: 1, _id: -1 });

const reaction = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: "SocialPost", required: true },
    author: { ...userRef, required: true },
    emoji: { type: String, required: true },
});
reaction.index({ post: 1, author: 1 }, { unique: true });

const report = new mongoose.Schema({
    reporter: { ...userRef, required: true },
    subject: { ...userRef, required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "SocialPost" },
    reason: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
    audit: [{
        moderator: userRef,
        action: { type: String, enum: ["resolved", "dismissed"] },
        at: Date,
    }],
}, { timestamps: true });

export const SocialGroup = mongoose.model("SocialGroup", group);
export const SocialPost = mongoose.model("SocialPost", post);
export const SocialComment = mongoose.model("SocialComment", comment);
export const SocialReaction = mongoose.model("SocialReaction", reaction);
export const SocialReport = mongoose.model("SocialReport", report);

const quota = new mongoose.Schema({
    _id: String,
    count: Number,
    expiresAt: { type: Date, expires: 0 },
});
export const RequestQuota = mongoose.model("RequestQuota", quota);
