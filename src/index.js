import express from "express";
import compression from "compression";
import cors from "cors";
import v1routes from "./routes/index.js";
import mongoose from "mongoose"; 
import config from "./config/config.js";
import jwtStrategy from "./config/passport.js";
import passport from "passport";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import {messageService} from "./services/index.js";


const app = express();
const port = 8082; 
const DB_URL = config.mongoose.url;
const router = express.Router();

app.use(express.json());
app.use(compression());
app.use(cookieParser());
app.use(cors({origin: 'http://localhost:5173', credentials: true}));
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

app.get('/', (req, res) => {
  res.send('Hello World!');
});
v1routes(app);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin : [config.appURL],
    methods: ["GET", "POST"],
  }
});
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("send_message", async ({ roomId, message }) => {
    await messageService.sendMessage(roomId, message.sender._id, message.content);
    io.to(roomId).emit("receive_message", message);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
}); 

server.listen(port, () => {
  console.log(`App and socket.io listening on port ${port}`);
});

mongoose
  .connect(DB_URL)
  .then(() => console.log("DB Connected"))
  .catch((error) => console.log("Error connecting to DB:", error));