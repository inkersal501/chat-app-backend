import { createHash } from "node:crypto";
import { RequestQuota } from "../models/social.model.js";
import { socialError } from "../services/privacy.service.js";

export async function enforceQuota(scope, identity, limit) {
    const now = Date.now();
    const minute = Math.floor(now / 60_000);
    const hash = createHash("sha256").update(String(identity)).digest("hex");
    const key = `${scope}:${hash}:${minute}`;
    const update = { $inc: { count: 1 } };
    let quota;
    try {
        quota = await RequestQuota.findOneAndUpdate({ _id: key }, {
            ...update, $setOnInsert: { expiresAt: new Date((minute + 2) * 60_000) },
        }, { upsert: true, returnDocument: "after" });
    } catch (error) {
        if (error.code !== 11000) throw error;
        quota = await RequestQuota.findOneAndUpdate({ _id: key }, update, { returnDocument: "after" });
    }
    if (quota.count > limit) {
        const error = socialError(429, "Too many requests. Try again shortly.");
        error.retryAfter = Math.ceil(((minute + 1) * 60_000 - now) / 1000);
        throw error;
    }
}

export function limitRequests(scope, limit, identity = (req) => req.user._id) {
    return async (req, res, next) => {
        try {
            await enforceQuota(scope, identity(req), limit);
            next();
        } catch (error) {
            if (error.retryAfter) res.set("Retry-After", String(error.retryAfter));
            res.status(error.statusCode || 503).json({
                msg: error.statusCode ? error.message : "Try again shortly.",
            });
        }
    };
}
