import { Strategy as JwtStrategy } from "passport-jwt";
import { sessionRevoked } from "../services/session.service.js";
import config from "./config.js"; 
import { User } from "../models/index.js"; 
 
const cookieExtract = (req) => {
  let token = null;
  // console.log("cookies", req.cookies);
  if(req && req.cookies) {
    token = req.cookies.token;
  }
  return token;
};

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  // jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken(),
  jwtFromRequest : cookieExtract,
  passReqToCallback: true,
};
 
const jwtVerify = async (req, payload, done) => {
  try {
    if (payload.type !== "access" || !Number.isFinite(payload.exp) || await sessionRevoked(cookieExtract(req))){
      return done(new Error("Invalid token type"));
    }
    const user = await User.findById(payload.id).select("_id username email").lean(); 
    if(!user){
      return done(null, false);
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
};
 
const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

export default jwtStrategy;
