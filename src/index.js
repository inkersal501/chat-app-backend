import express from "express";
import compression from "compression";
import cors from "cors";
import v1routes from "./routes/index.js";
import mongoose from "mongoose"; 
import config from "./config/config.js";
import jwtStrategy from "./config/passport.js";
import passport from "passport";

const app = express();
const port = 8082; 
const DB_URL = config.mongoose.url;
const router = express.Router();

app.use(express.json());
app.use(compression());
app.use(cors());
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

app.get('/', (req, res) => {
  res.send('Hello World!');
});
v1routes(app);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

mongoose
  .connect(DB_URL)
  .then(() => console.log("DB Connected"))
  .catch((error) => console.log("Error connecting to DB:", error));