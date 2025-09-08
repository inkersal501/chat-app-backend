import {createClient} from "redis";
const client = createClient();

client.on("error", (error) => console.error("Redis Error:", error));

await client.connect();
console.log("Redis Connected");
export default client;