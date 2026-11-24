import mongoose from "mongoose";
import { User } from "../models/index.js";

export const socialError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

export function requireId(value) {
    if (typeof value !== "string" || !mongoose.isObjectIdOrHexString(value)) {
        throw socialError(400, "Invalid resource ID.");
    }
    return new mongoose.Types.ObjectId(value);
}

export async function blockedPeers(id) {
    const [viewer, incoming] = await Promise.all([
        User.findById(id).select("blocked muted friends sentRequests receivedRequests").lean(),
        User.find({ blocked: id }).select("_id").lean(),
    ]);
    if (!viewer) throw socialError(401, "Sign in again.");
    for (const field of ["blocked", "muted", "friends", "sentRequests", "receivedRequests"]) {
        viewer[field] ??= [];
    }
    return { viewer, excluded: [...viewer.blocked, ...incoming.map(({ _id }) => _id)] };
}

export async function requireContactAllowed(from, to) {
    if (String(from) === String(to)) return;
    const blocked = await User.exists({ $or: [
        { _id: from, blocked: to },
        { _id: to, blocked: from },
    ] });
    if (blocked) throw socialError(403, "Contact is unavailable.");
}
