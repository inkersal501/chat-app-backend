import express from "express";
import compression from "compression";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import http from "http";
import cookieParser from "cookie-parser";
import passport from "passport";
import { Server } from "socket.io";
import { OidcTransaction } from "./routes/oidc.route.js";
import v1routes from "./routes/index.js";
import config from "./config/config.js";
import jwtStrategy from "./config/passport.js";
import { Chat, Message, User } from "./models/index.js";
import { RequestQuota, SocialReaction } from "./models/social.model.js";
import { enforceQuota } from "./middlewares/quota.middleware.js";
import { RevokedSession, sessionRevoked } from "./services/session.service.js";
import { messageService } from "./services/index.js";

const app = express();
const server = http.createServer(app);
const port = Number(config.port);

const allowedOrigin = (origin) => !origin || origin === config.appURL;
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !allowedOrigin(req.get("Origin"))) {
    return res.status(403).json({ msg: "Request origin is not allowed." });
  }
  next();
});
app.use(express.json({ limit: "32kb" }));
app.use(compression());
app.use(cookieParser());
app.use(cors({ origin: config.appURL, credentials: true }));
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

app.get("/", (_req, res) => res.send("Convo API is running."));
v1routes(app);

const io = new Server(server, {
  allowRequest: (req, done) => done(null, allowedOrigin(req.headers.origin)),
  cors: {
    origin: config.appURL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const getCookieToken = (cookieHeader = "") => {
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith("token="));
  return cookie ? decodeURIComponent(cookie.slice("token=".length)) : null;
};

io.use(async (socket, next) => {
  try {
    const token = getCookieToken(socket.handshake.headers.cookie);
    if (!token) return next(new Error("Authentication required."));

    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.type !== "access" || !Number.isFinite(payload.exp)) return next(new Error("Invalid access token."));

    const user = await User.findById(payload.id).select("_id username").lean();
    if (!user) return next(new Error("Account not found."));

    if (await sessionRevoked(token)) return next(new Error("Authentication required."));
    socket.data.user = user;
    socket.data.expiresAt = payload.exp * 1000;
    next();
  } catch {
    next(new Error("Authentication required."));
  }
});

io.on("connection", (socket) => {
  function expireSession() {
    const remaining = socket.data.expiresAt - Date.now();
    if (remaining <= 0) return socket.disconnect(true);
    expiryTimer = setTimeout(expireSession, Math.min(remaining, 2_147_483_647));
  }
  let expiryTimer;
  socket.once("disconnect", () => clearTimeout(expiryTimer));
  expireSession();
  const token = getCookieToken(socket.handshake.headers.cookie);
  async function sessionActive() {
    if (Date.now() < socket.data.expiresAt && !(await sessionRevoked(token))) return true;
    socket.disconnect(true);
    return false;
  }
  const revocationTimer = setInterval(() => {
    sessionActive().catch(() => socket.disconnect(true));
  }, 5_000);
  socket.once("disconnect", () => clearInterval(revocationTimer));
  let requestedRoom;
  let joinedRoom;
  let roomRequest = 0;

  socket.on("leave_room", (roomId) => {
    if (typeof roomId === "string" && mongoose.isObjectIdOrHexString(roomId)) {
      if (requestedRoom === roomId) {
        requestedRoom = undefined;
        roomRequest += 1;
      }
      if (joinedRoom === roomId) joinedRoom = undefined;
      void socket.leave(roomId);
    }
  });

  socket.on("join_room", async (roomId, acknowledge) => {
    try {
      if (!mongoose.isObjectIdOrHexString(roomId)) return acknowledge?.({ ok: false });
      requestedRoom = roomId;
      const currentRequest = ++roomRequest;
      if (!(await sessionActive()) || currentRequest !== roomRequest) return;
      if (joinedRoom && joinedRoom !== roomId) {
        const previousRoom = joinedRoom;
        joinedRoom = undefined;
        await socket.leave(previousRoom);
      }
      const isMember = await Chat.exists({ _id: roomId, participants: socket.data.user._id });
      if (currentRequest !== roomRequest || !socket.connected) return;
      if (!isMember) {
        acknowledge?.({ ok: false, msg: "Chat not found." });
        return;
      }

      joinedRoom = roomId;
      await socket.join(roomId);
      acknowledge?.({ ok: true });
    } catch {
      acknowledge?.({ ok: false, msg: "Unable to join this chat." });
    }
  });

  socket.on("send_message", async (request, acknowledge) => {
    try {
      if (!(await sessionActive())) return;
      await enforceQuota("message-send", socket.data.user._id, 120);
      const { roomId, content, clientId } = request ?? {};
      const message = await messageService.sendMessage(roomId, socket.data.user._id, content, clientId);
      const payload = { ...message.toObject(), roomId: roomId.toString() };
      io.to(roomId.toString()).to(socket.id).emit("receive_message", payload);
      acknowledge?.({ ok: true, message: payload });
    } catch (error) {
      acknowledge?.({ ok: false, msg: error.statusCode ? error.message : "Message could not be sent." });
    }
  });
});

mongoose.connect(config.mongoose.url)
  .then(() => Promise.all([Message, RequestQuota, SocialReaction, RevokedSession, ...(config.oidc ? [User, OidcTransaction] : [])].map((model) => model.createIndexes())))
  .then(() => {
    server.listen(port, () => console.log(`Convo API and realtime service listening on port ${port}`));
  })
  .catch((error) => {
    console.error("Unable to initialize MongoDB.", error.message);
    process.exitCode = 1;
  });
