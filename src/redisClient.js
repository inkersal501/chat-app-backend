import {createClient} from "redis";
import config from "./config/config.js";

const client = createClient({url: config.redisURL});

client.on("error", (error) => console.error("Redis Error:", error));

await client.connect();
console.log("Redis Connected");
export default client;