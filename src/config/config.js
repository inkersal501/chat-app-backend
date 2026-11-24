import dotenv from "dotenv";
import path from "path";
 
dotenv.config({ path: path.join(process.cwd(), ".env") });
  
if (!process.env.PORT || !process.env.MONGODB_URI) {
  throw new Error("Missing required environment variables: PORT or MONGODB_URI");
}

const oidcEnv = ["OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "OIDC_REDIRECT_URI"];
const oidcConfigured = oidcEnv.some((key) => Boolean(process.env[key]));
let oidc;
if (oidcConfigured) {
  if (!oidcEnv.every((key) => Boolean(process.env[key]))) throw new Error("Incomplete OIDC configuration.");
  const issuer = new URL(process.env.OIDC_ISSUER);
  const redirect = new URL(process.env.OIDC_REDIRECT_URI);
  const appOrigin = new URL(process.env.APP_URL);
  const loopback = (url) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    url.protocol === "http:" && process.env.NODE_ENV !== "production";
  if (issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.search || issuer.hash ||
      (redirect.protocol !== "https:" && !loopback(redirect)) ||
      (appOrigin.protocol !== "https:" && !loopback(appOrigin)) ||
      redirect.username || redirect.password || appOrigin.username || appOrigin.password ||
      appOrigin.pathname !== "/" || appOrigin.search || appOrigin.hash ||
      redirect.search || redirect.hash || !redirect.pathname.endsWith("/v1/user/oidc/callback")) {
    throw new Error("Invalid OIDC issuer, callback or app origin.");
  }
  oidc = { issuer, redirect, appOrigin: appOrigin.origin, clientId: process.env.OIDC_CLIENT_ID, clientSecret: process.env.OIDC_CLIENT_SECRET };
}

const config = {
  oidc,
  moderatorIds: new Set((process.env.CONVO_MODERATOR_IDS || "").split(",").map((id) => id.trim()).filter(Boolean)),
  feedEnabled: process.env.CONVO_FEED_ENABLED === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.CONVO_FEED_ENABLED !== "false"),
  node_env : process.env.NODE_ENV,
  port: process.env.PORT || 5000,
  mongoose: {
    url: process.env.MONGODB_URI,
  },
  jwt:{
    secret: process.env.JWTSECRET,
    expire: process.env.JWT_ACCESS_EXPIRATION_MINUTES
  },
  NodeEmail: process.env.NODE_EMAIL,
  NodePassword: process.env.NODE_PASSWORD,
  appURL: process.env.APP_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  redisURL: process.env.REDIS_URL
};

export default config;
