import express from "express";
import compression from "compression";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import http from "http";
import cookieParser from "cookie-parser";
import passport from "passport";
import { Server } from "socket.io";
import v1routes from "./routes/index.js";
import config from "./config/config.js";
import jwtStrategy from "./config/passport.js";
import { Chat, User } from "./models/index.js";
import { messageService } from "./services/index.js";

const app = express();
const server = http.createServer(app);
const port = Number(config.port);

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(compression());
app.use(cookieParser());
app.use(cors({ origin: config.appURL, credentials: true }));
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

app.get("/", (_req, res) => res.send("Convo API is running."));
v1routes(app);

const io = new Server(server, {
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
    if (payload.type !== "access") return next(new Error("Invalid access token."));

    const user = await User.findById(payload.id).select("_id username").lean();
    if (!user) return next(new Error("Account not found."));

    socket.data.user = user;
    next();
  } catch {
    next(new Error("Authentication required."));
  }
});

io.on("connection", (socket) => {
  socket.on("join_room", async (roomId, acknowledge) => {
    try {
      const isMember = await Chat.exists({ _id: roomId, participants: socket.data.user._id });
      if (!isMember) {
        acknowledge?.({ ok: false, msg: "Chat not found." });
        return;
      }

      await socket.join(roomId.toString());
      acknowledge?.({ ok: true });
    } catch {
      acknowledge?.({ ok: false, msg: "Unable to join this chat." });
    }
  });

  socket.on("send_message", async ({ roomId, content } = {}, acknowledge) => {
    try {
      const message = await messageService.sendMessage(roomId, socket.data.user._id, content);
      await socket.join(roomId.toString());
      const payload = { ...message.toObject(), roomId: roomId.toString() };
      io.to(roomId.toString()).emit("receive_message", payload);
      acknowledge?.({ ok: true, message: payload });
    } catch (error) {
      acknowledge?.({ ok: false, msg: error.message || "Message could not be sent." });
    }
  });
});

mongoose.connect(config.mongoose.url)
  .then(() => {
    server.listen(port, () => console.log(`Convo API and realtime service listening on port ${port}`));
  })
  .catch((error) => {
    console.error("Unable to connect to MongoDB.", error.message);
    process.exitCode = 1;
  });
