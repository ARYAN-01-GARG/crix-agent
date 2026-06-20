import { randomBytes } from "node:crypto";
import { generatePkce } from "./pkce.js";
import { startCallbackServer } from "./callback-server.js";
import { openBrowser } from "./browser.js";
import { requestDeviceCode, pollDeviceToken } from "./device-flow.js";
import { saveToken, loadToken, isExpired } from "./token-store.js";
import type { StoredToken } from "./token-store.js";
import type { DeviceFlowConfig } from "./device-flow.js";

export interface LoginConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  redirectUri?: string;
  scope: string;
  account: string;
  deviceFlow?: DeviceFlowConfig;
}

export interface LoginResult {
  token: StoredToken;
  method: "callback" | "device";
}

/** Returns a cached token if still valid, otherwise runs the full login flow. */
export async function getOrLogin(cfg: LoginConfig): Promise<StoredToken> {
  const cached = await loadToken(cfg.account);
  if (cached && !isExpired(cached)) return cached;

  const result = await login(cfg);
  return result.token;
}

/** Runs the full login flow: tries browser callback first, falls back to device code. */
export async function login(cfg: LoginConfig): Promise<LoginResult> {
  try {
    const token = await browserCallbackLogin(cfg);
    await saveToken(cfg.account, token);
    return { token, method: "callback" };
  } catch (callbackErr) {
    process.stderr.write(`[crix/auth] callback flow failed (${(callbackErr as Error).message}), falling back to device code\n`);

    if (!cfg.deviceFlow) throw callbackErr;

    const token = await deviceCodeLogin(cfg.deviceFlow);
    await saveToken(cfg.account, token);
    return { token, method: "device" };
  }
}

export async function logout(account: string): Promise<void> {
  const { deleteToken } = await import("./token-store.js");
  await deleteToken(account);
}

// ---------- internals ----------

async function browserCallbackLogin(cfg: LoginConfig): Promise<StoredToken> {
  const state = randomBytes(16).toString("hex");
  const pkce = generatePkce();

  const { port, result } = await startCallbackServer(state);
  const redirectUri = cfg.redirectUri ?? `http://127.0.0.1:${port}/callback`;

  const authUrl = new URL(cfg.authorizationUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", cfg.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", cfg.scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", pkce.challenge);
  authUrl.searchParams.set("code_challenge_method", pkce.method);

  openBrowser(authUrl.toString());

  const { code } = await result;

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      code_verifier: pkce.verifier,
    }).toString(),
  });

  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);

  const data = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (data.error || !data.access_token) {
    throw new Error(`Token exchange error: ${data.error ?? "no access_token"}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}

async function deviceCodeLogin(cfg: DeviceFlowConfig): Promise<StoredToken> {
  const { deviceCode, display, interval } = await requestDeviceCode(cfg);

  process.stdout.write(
    `\n[crix] Open this URL to authenticate:\n  ${display.verificationUri}\n` +
    `  Enter code: ${display.userCode}\n\n`
  );

  return pollDeviceToken(cfg, deviceCode, interval);
}
