import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_TEST_URI;

test("social access tracks friendship, blocks and current group membership", {
  skip: !mongoUri && "Set MONGODB_TEST_URI to run the integration test",
  timeout: 20_000,
}, async () => {
  const secret = randomUUID();
  const dbName = "convo_test_" + secret.replaceAll("-", "");
  const port = process.env.CONVO_TEST_PORT || "25190";
  const url = "http://127.0.0.1:" + port;
  const origin = "http://localhost:5173";
  const [peer, sender, outsider] = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId());
  const auth = (id) => ({
    Origin: origin,
    Cookie: "token=" + jwt.sign({ id, type: "access" }, secret, { expiresIn: "10m", jwtid: randomUUID() }),
  });
  const uri = new URL(mongoUri);
  uri.pathname = "/" + dbName;
  const child = spawn(process.execPath, ["src/index.js"], {
    env: { ...process.env, PORT: port, MONGODB_URI: String(uri), JWTSECRET: secret,
      JWT_ACCESS_EXPIRATION_MINUTES: "60", APP_URL: origin, NODE_ENV: "development",
      CONVO_FEED_ENABLED: "true", CONVO_MODERATOR_IDS: String(outsider) },
    stdio: ["ignore", "inherit", "inherit"],
  });
  const exited = once(child, "exit");
  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        if ((await fetch(url)).ok) break;
      } catch {
        // Wait for MongoDB indexes and HTTP startup.
      }
      if (attempt === 39 || child.exitCode !== null) throw new Error("Test server did not start.");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await mongoose.connect(String(uri));
    const db = mongoose.connection.db;
    await db.collection("users").insertMany([
      { _id: peer, username: "Peer", email: "peer@example.test", friends: [sender] },
      { _id: sender, username: "Sender", email: "sender@example.test", friends: [peer] },
      { _id: outsider, username: "Moderator", email: "moderator@example.test" },
    ]);
    const call = (as, path, method = "GET", data) => fetch(url + "/v1/social" + path, {
      method, headers: { ...auth(as), "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const groupRes = await call(sender, "/groups", "POST", { name: "Friends group" });
    assert.equal(groupRes.status, 201);
    const group = await groupRes.json();
    const groupPath = "/groups/" + group._id;
    assert.equal((await call(outsider, groupPath + "/membership", "PUT")).status, 404);
    assert.equal((await call(sender, groupPath + "/invitations/" + peer, "PUT")).status, 204);
    assert.equal((await call(peer, groupPath + "/membership", "PUT")).status, 204);
    const groupPostRes = await call(sender, "/posts", "POST", { group: group._id, text: "Members only" });
    assert.equal(groupPostRes.status, 201);
    const groupPostPath = "/posts/" + (await groupPostRes.json())._id;
    assert.equal((await call(outsider, groupPostPath)).status, 404);
    assert.equal((await call(peer, groupPostPath)).status, 200);
    assert.equal((await call(peer, groupPostPath + "/comments", "POST", { text: "Reply" })).status, 201);
    assert.equal((await call(peer, groupPostPath + "/reactions", "PUT", { emoji: "👍" })).status, 204);
    assert.deepEqual(await (await call(sender, groupPostPath + "/reactions")).json(), { counts: { "👍": 1 }, mine: null });
    assert.equal((await (await call(sender, "/activity")).json()).replies.length, 1);
    assert.equal((await call(sender, "/mutes/" + peer, "PUT")).status, 204);
    assert.equal((await (await call(sender, "/activity")).json()).replies.length, 0);
    assert.equal((await call(peer, groupPostPath, "PATCH", { text: "Unauthorized" })).status, 404);
    assert.equal((await call(sender, groupPath + "/members/" + peer, "DELETE")).status, 204);
    assert.equal((await call(peer, groupPostPath + "/comments")).status, 404);
    assert.equal((await call(peer, groupPostPath + "/reactions", "PUT", { emoji: "😂" })).status, 404);
    const postRes = await call(sender, "/posts", "POST", { text: "Friends only" });
    assert.equal(postRes.status, 201);
    const post = await postRes.json();
    assert.equal((await call(peer, "/posts/" + post._id)).status, 200);
    assert.equal((await call(outsider, "/posts/" + post._id)).status, 404);
    assert.equal((await call(peer, "/reports", "POST", { post: post._id, reason: "Test report" })).status, 201);
    assert.equal((await call(peer, "/moderation/reports")).status, 404);
    const { list } = await (await call(outsider, "/moderation/reports")).json();
    assert.equal(list.length, 1);
    assert.equal((await call(outsider, "/moderation/reports/" + list[0]._id, "PATCH", { status: "resolved" })).status, 204);
    const stored = await db.collection("socialreports").findOne({ _id: new mongoose.Types.ObjectId(list[0]._id) });
    assert.equal(stored.audit[0].action, "resolved");
    assert.equal((await call(peer, "/blocks/" + sender, "PUT")).status, 204);
    assert.equal((await call(peer, "/posts/" + post._id)).status, 404);
    const peerAuth = auth(peer);
    assert.equal((await fetch(url + "/v1/user/logout", { method: "POST", headers: peerAuth })).status, 200);
    assert.equal((await fetch(url + "/v1/social/people", { headers: peerAuth })).status, 401);
  } finally {
    child.kill();
    await exited;
    try {
      if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  }
});
