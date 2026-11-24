import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import * as oidc from "openid-client";
import config from "../config/config.js";
import { limitRequests } from "../middlewares/quota.middleware.js";
import auth from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";
import { sessionRevoked } from "../services/session.service.js";
import tokenService from "../services/token.service.js";

const router = Router();
const cookieName = "convo_oidc_transaction";
const transactionLifetime = 10 * 60 * 1000;
const settings = config.oidc;
const hash = (value) => createHash("sha256").update(value).digest("hex");

export const OidcTransaction = mongoose.model("OidcTransaction", new mongoose.Schema({
    _id: String,
    state: { type: String, required: true },
    nonce: { type: String, required: true },
    verifier: { type: String, required: true },
    userId: mongoose.Schema.Types.ObjectId,
    sessionHash: String,
    expiresAt: { type: Date, required: true, expires: 0 },
}));

let discovery;
function provider() {
    discovery ??= oidc.discovery(settings.issuer, settings.clientId, settings.clientSecret, undefined, {
        execute: [oidc.enableNonRepudiationChecks],
    }).catch((error) => {
        discovery = undefined;
        throw error;
    });
    return discovery;
}

function callbackCookie() {
    return {
        httpOnly: true,
        secure: settings.redirect.protocol === "https:",
        sameSite: "lax",
        path: settings.redirect.pathname,
    };
}

function redirect(res, result, path = "/login") {
    const url = new URL(path, settings.appOrigin);
    url.searchParams.set("oidc", result);
    res.redirect(303, url.href);
}

router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    if (!settings) return res.sendStatus(404);
    next();
});

async function start(req, res) {
    const client = await provider();
    const key = randomBytes(32).toString("base64url");
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const url = oidc.buildAuthorizationUrl(client, {
        redirect_uri: settings.redirect.href,
        scope: "openid",
        response_type: "code",
        response_mode: "query",
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
        code_challenge_method: "S256",
        state,
        nonce,
        ...(req.user ? { prompt: "login" } : {}),
    });
    await OidcTransaction.create({
        _id: hash(key),
        state,
        nonce,
        verifier,
        expiresAt: new Date(Date.now() + transactionLifetime),
        ...(req.user ? { userId: req.user._id, sessionHash: hash(req.cookies.token) } : {}),
    });
    res.cookie(cookieName, key, { ...callbackCookie(), maxAge: transactionLifetime });
    if (req.user) return res.json({ url: url.href });
    res.redirect(303, url.href);
}

router.get("/start", limitRequests("oidc-start", 30, (req) => req.ip), start);
router.post("/link", auth, limitRequests("oidc-link", 10), start);

router.get("/callback", async (req, res) => {
    const key = req.cookies[cookieName];
    res.clearCookie(cookieName, callbackCookie());
    if (typeof key !== "string" || typeof req.query.state !== "string") return redirect(res, "failed");

    try {
        const transaction = await OidcTransaction.findOneAndDelete({
            _id: hash(key),
            state: req.query.state,
            expiresAt: { $gt: new Date() },
        }).lean();
        if (!transaction) return redirect(res, "failed");

        if (transaction.userId) {
            const token = req.cookies.token;
            if (typeof token !== "string" || hash(token) !== transaction.sessionHash || await sessionRevoked(token)) {
                return redirect(res, "failed");
            }
            const payload = jwt.verify(token, config.jwt.secret);
            if (payload.type !== "access" || payload.id !== String(transaction.userId)) return redirect(res, "failed");
        }

        const callback = new URL(settings.redirect);
        callback.search = new URL(req.originalUrl, settings.redirect.origin).search;
        const tokens = await oidc.authorizationCodeGrant(await provider(), callback, {
            pkceCodeVerifier: transaction.verifier,
            expectedNonce: transaction.nonce,
            expectedState: transaction.state,
            idTokenExpected: true,
        });
        const { iss, sub } = tokens.claims() ?? {};
        if (typeof iss !== "string" || typeof sub !== "string" || !sub || sub.length > 255) {
            return redirect(res, "failed");
        }

        const identity = { oidcIssuer: iss, oidcSubject: sub };
        if (transaction.userId) {
            const link = await User.updateOne({
                _id: transaction.userId,
                $or: [{ oidcSubject: { $exists: false } }, identity],
            }, { $set: identity });
            return redirect(res, link.matchedCount ? "linked" : "failed", "/home");
        }

        const user = await User.findOne(identity).select("_id").lean();
        if (!user) return redirect(res, "unlinked");
        const token = await tokenService.generateAuthTokens(user, "access");
        res.cookie("token", token, {
            httpOnly: true,
            secure: settings.redirect.protocol === "https:",
            sameSite: "lax",
            maxAge: Number(config.jwt.expire) * 60_000,
        });
        return redirect(res, "signed-in");
    } catch (error) {
        if (error.code !== 11000) console.error("OIDC callback failed", error.name, error.code);
        return redirect(res, "failed", req.cookies.token ? "/home" : "/login");
    }
});

router.use((error, _req, res, _next) => {
    console.error("OIDC start failed", error.name, error.code);
    res.status(503).json({ msg: "Identity provider is unavailable." });
});

export default router;
