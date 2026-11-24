import { createHash } from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const revokedSessionSchema = new mongoose.Schema({
    _id: String,
    expiresAt: { type: Date, expires: 0 },
});
export const RevokedSession = mongoose.model("RevokedSession", revokedSessionSchema);
const tokenHash = (token) => createHash("sha256").update(token).digest("hex");

export async function sessionRevoked(token) {
    return Boolean(await RevokedSession.exists({ _id: tokenHash(token) }));
}

export async function revokeSession(token) {
    const payload = jwt.decode(token);
    if (!Number.isFinite(payload?.exp)) return;
    await RevokedSession.updateOne({ _id: tokenHash(token) }, {
        $setOnInsert: { expiresAt: new Date(payload.exp * 1000) },
    }, { upsert: true });
}
