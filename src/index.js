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
 
const app = express();
const port = 8082; 
const DB_URL = config.mongoose.url;
const router = express.Router();

app.use(express.json());
app.use(compression());
app.use(cors({origin: '*'}));
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

app.get('/', (req, res) => {
  res.send('Hello World!');
});
v1routes(app);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin : ['http://localhost:5173'],
    methods: ["GET", "POST"],
  }
});
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("send_message", ({ roomId, message }) => {
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