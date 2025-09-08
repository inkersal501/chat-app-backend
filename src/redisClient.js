import {createClient} from "redis";
import config from "./config/config.js";

const client = createClient();

client.on("error", (error) => console.error("Redis Error:", error));

await client.connect({url: config.redisURL, socket: {tls: true}});
console.log("Redis Connected");
export default client;