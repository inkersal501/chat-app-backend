import { Router } from "express";
import { limitRequests } from "../middlewares/quota.middleware.js";
import config from "../config/config.js";
import { User } from "../models/index.js";
import { SocialComment, SocialGroup, SocialPost, SocialReaction, SocialReport } from "../models/social.model.js";
import { blockedPeers, requireContactAllowed, requireId, socialError } from "../services/privacy.service.js";

const router = Router();
router.use(["/activity", "/groups", "/posts"], (_req, res, next) => {
    if (!config.feedEnabled) return res.status(404).json({ msg: "Feed is unavailable." });
    next();
});
const identity = "_id username";

router.use("/moderation", (req, _res, next) => {
    if (!config.moderatorIds.has(String(req.user._id))) throw socialError(404, "Resource not found.");
    next();
});
const emojis = ["👍", "❤️", "😂", "🎉"];
const sameId = (a, b) => String(a) === String(b);

function text(value, limit) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > limit) {
        throw socialError(400, `Enter text between 1 and ${limit} characters.`);
    }
    return value.trim();
}

function pageFilter(before) {
    return before === undefined ? {} : { _id: { $lt: requireId(before) } };
}

async function page(query) {
    const rows = await query.sort({ _id: -1 }).limit(21).lean();
    const list = rows.slice(0, 20);
    return { list, nextCursor: rows.length > 20 ? list.at(-1)._id : null };
}

async function visiblePost(rawId, userId, { viewer, excluded }) {
    const post = await SocialPost.findById(requireId(rawId)).populate("author", identity).lean();
    if (post?.author && !excluded.some((id) => sameId(id, post.author._id))) {
        const allowed = post.group
            ? await SocialGroup.exists({ _id: post.group, members: userId })
            : sameId(post.author._id, userId) || viewer.friends.some((id) => sameId(id, post.author._id));
        if (allowed) return post;
    }
    throw socialError(404, "Post not found.");
}

const limitReads = limitRequests("social-read", 120);
const limitWrites = limitRequests("social-write", 30);
router.use((req, res, next) => (req.method === "GET" ? limitReads : limitWrites)(req, res, next));

router.use(async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const userId = req.user._id;
    res.locals.userId = userId;
    res.locals.privacy = await blockedPeers(userId);
    next();
});

router.get("/people", async (req, res) => {
    const { userId, privacy: { viewer, excluded } } = res.locals;
    const search = typeof req.query.username === "string" ? req.query.username.trim() : "";
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const [friends, blocked, results] = await Promise.all([
        User.find({ _id: { $in: viewer.friends, $nin: excluded } }).select(identity).lean(),
        User.find({ _id: { $in: viewer.blocked } }).select(identity).lean(),
        search.length >= 2 && search.length <= 40
            ? User.find({ username: { $regex: `^${escaped}`, $options: "i" }, _id: { $nin: [userId, ...excluded] } }).select(identity).limit(15).lean()
            : [],
    ]);
    res.json({ friends, blocked, muted: viewer.muted, results });
});

for (const [path, field] of [["blocks", "blocked"], ["mutes", "muted"]]) {
    router.put(`/${path}/:id`, async (req, res) => {
        const target = requireId(req.params.id);
        if (sameId(target, req.user._id) || !(await User.exists({ _id: target }))) {
            throw socialError(404, "Account not found.");
        }
        await User.updateOne({ _id: req.user._id }, { $addToSet: { [field]: target } });
        res.sendStatus(204);
    });
    router.delete(`/${path}/:id`, async (req, res) => {
        await User.updateOne({ _id: req.user._id }, { $pull: { [field]: requireId(req.params.id) } });
        res.sendStatus(204);
    });
}

router.get("/groups", async (_req, res) => {
    const id = res.locals.userId;
    const groups = await SocialGroup.find({ $or: [{ members: id }, { invited: id }] })
        .select("name owner admins members invited").populate("members", identity).lean();
    res.json({ groups: groups.map(({ invited, members, ...group }) => {
        const joined = members.some((member) => sameId(member._id, id));
        return { ...group, joined, invited: invited.some((member) => sameId(member, id)), members: joined ? members : [] };
    }) });
});

router.post("/groups", async (req, res) => {
    const owner = res.locals.userId;
    const group = await SocialGroup.create({ name: text(req.body?.name, 80), owner, members: [owner] });
    res.status(201).json(group);
});

router.put("/groups/:id/invitations/:target", async (req, res) => {
    const { userId, privacy: { viewer } } = res.locals;
    const target = requireId(req.params.target);
    if (!viewer.friends.some((id) => sameId(id, target))) throw socialError(403, "Invite a friend.");
    await requireContactAllowed(userId, target);
    const result = await SocialGroup.updateOne({
        _id: requireId(req.params.id), $or: [{ owner: userId }, { admins: userId }], members: { $ne: target },
    }, { $addToSet: { invited: target } });
    if (!result.matchedCount) throw socialError(404, "Group or invitation unavailable.");
    res.sendStatus(204);
});

router.put("/groups/:id/membership", async (req, res) => {
    const userId = res.locals.userId;
    const result = await SocialGroup.updateOne({
        _id: requireId(req.params.id), $or: [{ invited: userId }, { members: userId }],
    }, { $pull: { invited: userId }, $addToSet: { members: userId } });
    if (!result.matchedCount) throw socialError(404, "Invitation not found.");
    res.sendStatus(204);
});

router.delete("/groups/:id/members/:target", async (req, res) => {
    const userId = res.locals.userId;
    const target = requireId(req.params.target);
    const permissions = sameId(target, userId)
        ? [{ members: userId }, { invited: userId }]
        : [{ owner: userId }, { admins: userId, $and: [{ admins: { $ne: target } }] }];
    const result = await SocialGroup.updateOne({
        _id: requireId(req.params.id), owner: { $ne: target }, $or: permissions,
    }, { $pull: { members: target, admins: target, invited: target } });
    if (!result.matchedCount) throw socialError(404, "Membership cannot be changed.");
    res.sendStatus(204);
});

router.put("/groups/:id/admins/:target", async (req, res) => {
    const target = requireId(req.params.target);
    const operator = req.body?.admin === true ? "$addToSet" : "$pull";
    const result = await SocialGroup.updateOne({
        _id: requireId(req.params.id), owner: res.locals.userId, members: target, $and: [{ owner: { $ne: target } }],
    }, { [operator]: { admins: target } });
    if (!result.matchedCount) throw socialError(404, "Member or group unavailable.");
    res.sendStatus(204);
});

router.get("/activity", async (_req, res) => {
    const { userId, privacy: { viewer, excluded } } = res.locals;
    const groups = await SocialGroup.find({ members: userId }).distinct("_id");
    const posts = await SocialPost.find({ author: userId, group: { $in: [null, ...groups] } })
        .sort({ _id: -1 }).limit(100).select("_id").lean();
    const friendIds = viewer.friends.filter((id) => !excluded.some((blocked) => sameId(blocked, id)));
    const requests = await User.find({ _id: { $in: viewer.receivedRequests, $nin: [...excluded, ...viewer.muted] } })
        .select(identity).limit(20).lean();
    const comments = await SocialComment.find({
        post: { $in: posts.map(({ _id }) => _id) }, author: { $nin: [userId, ...excluded, ...viewer.muted] },
    }).sort({ _id: -1 }).limit(20).populate("author", identity).populate("post", "group").lean();
    const membership = await SocialGroup.find({ _id: { $in: groups } }).select("members").lean();
    const membersByGroup = new Map(membership.map((group) => [String(group._id), group.members.map(String)]));
    res.json({
        requests,
        replies: comments.filter(({ author, post }) => author && post && (post.group
            ? membersByGroup.get(String(post.group))?.includes(String(author._id))
            : friendIds.some((id) => sameId(id, author._id))))
            .map(({ _id, author, post, createdAt }) => ({ _id, author, post: post._id, createdAt })),
    });
});

router.get("/posts", async (req, res) => {
    const { userId, privacy: { viewer, excluded } } = res.locals;
    const group = req.query.group === undefined ? null : requireId(req.query.group);
    if (group && !(await SocialGroup.exists({ _id: group, members: userId }))) {
        throw socialError(404, "Group not found.");
    }
    const author = group ? { $nin: excluded } : { $in: [userId, ...viewer.friends], $nin: excluded };
    res.json(await page(SocialPost.find({ ...pageFilter(req.query.before), group, author }).populate("author", identity)));
});

router.post("/posts", async (req, res) => {
    const author = res.locals.userId;
    const group = req.body?.group == null ? null : requireId(req.body.group);
    if (group && !(await SocialGroup.exists({ _id: group, members: author }))) {
        throw socialError(404, "Group not found.");
    }
    const post = await SocialPost.create({ author, group, text: text(req.body?.text, 4000) });
    res.status(201).json(post);
});

router.use("/posts/:id", async (req, res, next) => {
    res.locals.post = await visiblePost(req.params.id, res.locals.userId, res.locals.privacy);
    next();
});

router.get("/posts/:id", (_req, res) => res.json(res.locals.post));
router.patch("/posts/:id", async (req, res) => {
    const result = await SocialPost.updateOne({ _id: res.locals.post._id, author: res.locals.userId },
        { $set: { text: text(req.body?.text, 4000) } });
    if (!result.matchedCount) throw socialError(404, "Post not found.");
    res.sendStatus(204);
});

router.delete("/posts/:id", async (_req, res) => {
    const post = res.locals.post._id;
    const result = await SocialPost.deleteOne({ _id: post, author: res.locals.userId });
    if (!result.deletedCount) throw socialError(404, "Post not found.");
    await Promise.all([SocialComment.deleteMany({ post }), SocialReaction.deleteMany({ post })]);
    res.sendStatus(204);
});

router.get("/posts/:id/comments", async (req, res) => {
    const { post, privacy: { excluded } } = res.locals;
    res.json(await page(SocialComment.find({ ...pageFilter(req.query.before), post: post._id, author: { $nin: excluded } }).populate("author", identity)));
});

router.post("/posts/:id/comments", async (req, res) => {
    const { post, userId } = res.locals;
    const comment = await SocialComment.create({ post: post._id, author: userId, text: text(req.body?.text, 2000) });
    res.status(201).json(comment);
});

router.patch("/posts/:id/comments/:comment", async (req, res) => {
    const { post, userId } = res.locals;
    const result = await SocialComment.updateOne({ _id: requireId(req.params.comment), post: post._id, author: userId },
        { $set: { text: text(req.body?.text, 2000) } });
    if (!result.matchedCount) throw socialError(404, "Comment not found.");
    res.sendStatus(204);
});

router.delete("/posts/:id/comments/:comment", async (req, res) => {
    const { post, userId } = res.locals;
    const result = await SocialComment.deleteOne({ _id: requireId(req.params.comment), post: post._id, author: userId });
    if (!result.deletedCount) throw socialError(404, "Comment not found.");
    res.sendStatus(204);
});

router.get("/posts/:id/reactions", async (_req, res) => {
    const { post, userId, privacy: { excluded } } = res.locals;
    const filter = { post: post._id, author: { $nin: excluded } };
    const [counts, mine] = await Promise.all([
        SocialReaction.aggregate([{ $match: filter }, { $group: { _id: "$emoji", count: { $sum: 1 } } }]),
        SocialReaction.findOne({ post: post._id, author: userId }).select("emoji").lean(),
    ]);
    res.json({ counts: Object.fromEntries(counts.map(({ _id, count }) => [_id, count])), mine: mine?.emoji ?? null });
});

router.put("/posts/:id/reactions", async (req, res) => {
    const { post, userId } = res.locals;
    const emoji = req.body?.emoji;
    const key = { post: post._id, author: userId };
    if (emoji === null) await SocialReaction.deleteOne(key);
    else {
        if (!emojis.includes(emoji)) throw socialError(400, "Choose a supported reaction.");
        try {
            await SocialReaction.updateOne(key, { $set: { emoji } }, { upsert: true });
        } catch (error) {
            if (error.code !== 11000) throw error;
            await SocialReaction.updateOne(key, { $set: { emoji } });
        }
    }
    res.sendStatus(204);
});

router.post("/reports", async (req, res) => {
    const { userId, privacy } = res.locals;
    const post = req.body?.post ? await visiblePost(req.body.post, userId, privacy) : null;
    const subject = post ? post.author._id : requireId(req.body?.subject);
    if (sameId(subject, userId) || !(await User.exists({ _id: subject }))) {
        throw socialError(404, "Account not found.");
    }
    await SocialReport.create({ reporter: userId, subject, post: post?._id, reason: text(req.body?.reason, 1000) });
    res.sendStatus(201);
});

router.get("/moderation/reports", async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(await page(SocialReport.find({ ...pageFilter(req.query.before), status: "open" })));
});

router.patch("/moderation/reports/:id", async (req, res) => {
    const { status } = req.body ?? {};
    if (!["resolved", "dismissed"].includes(status)) throw socialError(400, "Choose a report disposition.");
    const result = await SocialReport.updateOne({
        _id: requireId(req.params.id), status: "open",
    }, {
        $set: { status },
        $push: { audit: { moderator: req.user._id, action: status, at: new Date() } },
    });
    if (!result.matchedCount) throw socialError(404, "Open report not found.");
    res.sendStatus(204);
});

router.use((error, _req, res, _next) => {
    if (!error.statusCode) console.error("Social operation failed", error.name, error.code);
    res.status(error.statusCode || 500).json({ msg: error.statusCode ? error.message : "Unable to complete this action." });
});

export default router;
