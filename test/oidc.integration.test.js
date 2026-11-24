import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, createPublicKey, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_TEST_URI;

test("OIDC links an authenticated account and rejects replay and duplicate links", {
    skip: !mongoUri && "Set MONGODB_TEST_URI to run the integration test",
    timeout: 20_000,
}, async () => {
    const directory = await mkdtemp(join(tmpdir(), "convo-oidc-test-"));
    const keyFile = join(directory, "issuer.key");
    const certFile = join(directory, "issuer.pem");
    const secret = randomUUID();
    const database = new URL(mongoUri);
    database.pathname = "/convo_oidc_test_" + secret.replaceAll("-", "");
    const origin = "http://127.0.0.1:" + (process.env.CONVO_OIDC_TEST_PORT || "25194");
    const base = origin + "/v1/user/oidc";
    const callback = base + "/callback";
    const clientId = "convo-test";
    const clientSecret = randomUUID();
    let provider;
    let child;
    let exited;
    try {
        execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
            "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1", "-keyout", keyFile, "-out", certFile], { stdio: "ignore" });
        const key = await readFile(keyFile);
        const cert = await readFile(certFile);
        const jwk = { ...createPublicKey(key).export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
        let issuer;
        const codes = new Map();
        provider = createServer({ key, cert }, async (req, res) => {
            res.setHeader("Content-Type", "application/json");
            if (req.url === "/.well-known/openid-configuration") {
                return res.end(JSON.stringify({
                    issuer, authorization_endpoint: issuer + "/authorize", token_endpoint: issuer + "/token",
                    jwks_uri: issuer + "/jwks", response_types_supported: ["code"],
                    subject_types_supported: ["public"], id_token_signing_alg_values_supported: ["RS256"],
                    code_challenge_methods_supported: ["S256"], token_endpoint_auth_methods_supported: ["client_secret_post"],
                }));
            }
            if (req.url === "/jwks") return res.end(JSON.stringify({ keys: [jwk] }));
            let body = "";
            for await (const chunk of req) body += chunk;
            const form = new URLSearchParams(body);
            const code = form.get("code");
            const authorization = codes.get(code);
            codes.delete(code);
            if (req.url !== "/token" || !authorization || form.get("client_secret") !== clientSecret ||
                form.get("client_id") !== clientId || form.get("redirect_uri") !== callback ||
                createHash("sha256").update(form.get("code_verifier") || "").digest("base64url") !== authorization.challenge) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: "invalid_grant" }));
            }
            const idToken = jwt.sign({ nonce: authorization.invalidNonce ? "wrong-nonce" : authorization.nonce }, key, {
                algorithm: "RS256", keyid: "test-key", issuer, audience: clientId, subject: "provider-user", expiresIn: "5m",
            });
            res.end(JSON.stringify({ access_token: randomUUID(), token_type: "Bearer", id_token: idToken }));
        });
        provider.listen(0, "127.0.0.1");
        await once(provider, "listening");
        issuer = "https://127.0.0.1:" + provider.address().port;

        child = spawn(process.execPath, ["src/index.js"], {
            env: { ...process.env, NODE_EXTRA_CA_CERTS: certFile, NODE_ENV: "development",
                PORT: new URL(origin).port, APP_URL: origin, MONGODB_URI: String(database),
                JWTSECRET: secret, JWT_ACCESS_EXPIRATION_MINUTES: "60", OIDC_ISSUER: issuer,
                OIDC_CLIENT_ID: clientId, OIDC_CLIENT_SECRET: clientSecret, OIDC_REDIRECT_URI: callback },
            stdio: ["ignore", "inherit", "inherit"],
        });
        exited = once(child, "exit");
        for (let attempt = 0; ; attempt += 1) {
            if (await fetch(origin).then((response) => response.ok).catch(() => false)) break;
            if (attempt === 39 || child.exitCode !== null) throw new Error("Test server did not start.");
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        await mongoose.connect(String(database));
        const users = mongoose.connection.db.collection("users");
        const [account, second] = await Promise.all([
            users.insertOne({ username: "Existing account", email: "existing@example.test" }),
            users.insertOne({ username: "Other account", email: "other@example.test" }),
        ]);
        const session = (id) => "token=" + jwt.sign({ id, type: "access" }, secret, { expiresIn: "10m", jwtid: randomUUID() });
        const options = { redirect: "manual" };
        const pathOf = (response) => new URL(response.headers.get("location")).searchParams.get("oidc");

        async function begin(auth, invalidNonce = false) {
            const response = auth
                ? await fetch(base + "/link", { ...options, method: "POST", headers: { Origin: origin, Cookie: auth } })
                : await fetch(base + "/start", options);
            assert.equal(response.status, auth ? 200 : 303);
            const cookie = response.headers.get("set-cookie");
            assert.match(cookie, /HttpOnly; SameSite=Lax/i);
            const authorization = new URL(auth ? (await response.json()).url : response.headers.get("location"));
            assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
            const code = randomUUID();
            const nonce = authorization.searchParams.get("nonce");
            codes.set(code, { nonce, invalidNonce, challenge: authorization.searchParams.get("code_challenge") });
            const url = new URL(callback);
            url.searchParams.set("code", code);
            url.searchParams.set("state", authorization.searchParams.get("state"));
            return { url, cookie: cookie.split(";")[0] };
        }

        function complete(transaction, auth = "") {
            return fetch(transaction.url, { ...options, headers: { Cookie: [transaction.cookie, auth].filter(Boolean).join("; ") } });
        }

        assert.equal((await fetch(base + "/link", { method: "POST", headers: { Origin: origin } })).status, 401);
        assert.equal(pathOf(await complete(await begin())), "unlinked");
        const auth = session(String(account.insertedId));
        const wrongSession = await begin(auth);
        assert.equal(pathOf(await complete(wrongSession, session(String(account.insertedId)))), "failed");
        const wrongState = await begin(auth);
        wrongState.url.searchParams.set("state", "invalid");
        assert.equal(pathOf(await complete(wrongState, auth)), "failed");
        assert.equal(pathOf(await complete(await begin(auth, true), auth)), "failed");
        const link = await begin(auth);
        assert.equal(pathOf(await complete(link, auth)), "linked");
        assert.equal(pathOf(await complete(link, auth)), "failed");
        const otherAuth = session(String(second.insertedId));
        assert.equal(pathOf(await complete(await begin(otherAuth), otherAuth)), "failed");
        const signedIn = await complete(await begin());
        assert.equal(pathOf(signedIn), "signed-in");
        const loginCookie = signedIn.headers.getSetCookie().find((value) => value.startsWith("token="));
        assert.ok(loginCookie);
        const current = await fetch(origin + "/v1/user/me", { headers: { Cookie: loginCookie.split(";")[0] } });
        assert.equal((await current.json()).user._id, String(account.insertedId));
        assert.equal(await users.countDocuments({ oidcSubject: "provider-user" }), 1);
    } finally {
        if (child) {
            child.kill();
            await exited;
        }
        provider?.closeAllConnections();
        if (provider?.listening) await new Promise((resolve) => provider.close(resolve));
        try {
            if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
        } finally {
            await mongoose.disconnect();
            await rm(directory, { recursive: true, force: true });
        }
    }
});
