import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import config from "./config.js"; 
import { User } from "../models/index.js"; 
 
const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken(),
};
 
const jwtVerify = async (payload, done) => {
  try {
    if(payload.type !== "access"){
      return done(new Error("Invalid token type"));
    }
    const user = await User.findById(payload.id);
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
