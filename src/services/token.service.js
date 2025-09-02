import jwt from "jsonwebtoken";
import config from "../config/config.js";
 
const generateToken = (userId, expires, type, secret = config.jwt.secret) => { 
  const payload = { id: userId, exp: expires, type };  
  return jwt.sign(payload, secret);
};

const generateAuthTokens = async (user, tokenType) => {  
  const expiration = Math.floor(Date.now()/1000 + config.jwt.expire * 24 * 60 * 60);     
  return generateToken(user._id, expiration, tokenType);  
};
  
export default {
  generateToken,
  generateAuthTokens,
};