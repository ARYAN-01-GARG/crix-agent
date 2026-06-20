import type { StoredToken } from "./token-store.js";

export interface DeviceFlowConfig {
  deviceAuthUrl: string;
  tokenUrl: string;
  clientId: string;
  scope: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

export interface DeviceCode {
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
}

export async function requestDeviceCode(
  cfg: DeviceFlowConfig
): Promise<{ deviceCode: string; display: DeviceCode; interval: number }> {
  const res = await fetch(cfg.deviceAuthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, scope: cfg.scope }).toString(),
  });

  if (!res.ok) throw new Error(`Device auth request failed: ${res.status}`);

  const data = (await res.json()) as DeviceCodeResponse;
  return {
    deviceCode: data.device_code,
    display: {
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      verificationUriComplete: data.verification_uri_complete,
    },
    interval: data.interval ?? 5,
  };
}

/**
 * Polls the token endpoint until the user authorises (or the code expires).
 * Returns a StoredToken on success, throws on error or timeout.
 */
export async function pollDeviceToken(
  cfg: DeviceFlowConfig,
  deviceCode: string,
  intervalSeconds: number
): Promise<StoredToken> {
  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  let currentInterval = intervalSeconds;

  while (true) {
    await delay(currentInterval * 1000);

    const res = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }).toString(),
    });

    const data = (await res.json()) as TokenResponse;

    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      currentInterval += 5;
      continue;
    }
    if (data.error) throw new Error(`Device token error: ${data.error}`);
    if (!data.access_token) throw new Error("No access_token in response");

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };
  }
}
