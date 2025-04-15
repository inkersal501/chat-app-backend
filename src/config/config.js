import dotenv from "dotenv";
import path from "path";
 
dotenv.config({ path: path.join(process.cwd(), '.env') });
 
// console.log("PORT from env:", process.env.PORT);
// console.log("MONGODB_URI from env:", process.env.MONGODB_URI);

if (!process.env.PORT || !process.env.MONGODB_URI) {
  throw new Error("Missing required environment variables: PORT or MONGODB_URI");
}

const config = {
  port: process.env.PORT || 5000,
  mongoose: {
    url: process.env.MONGODB_URI,
  },
  jwt:{
    secret: process.env.JWTSECRET,
    expire: process.env.JWT_ACCESS_EXPIRATION_MINUTES
  },
  NodeEmail: process.env.NODE_EMAIL,
  NodePassword: process.env.NODE_PASSWORD
};

export default config;
