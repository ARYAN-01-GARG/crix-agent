import keytar from "keytar";

const SERVICE = "crix";

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export async function saveToken(account: string, token: StoredToken): Promise<void> {
  await keytar.setPassword(SERVICE, account, JSON.stringify(token));
}

export async function loadToken(account: string): Promise<StoredToken | null> {
  const raw = await keytar.getPassword(SERVICE, account);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

export async function deleteToken(account: string): Promise<void> {
  await keytar.deletePassword(SERVICE, account);
}

export function isExpired(token: StoredToken): boolean {
  if (!token.expiresAt) return false;
  return Date.now() >= token.expiresAt - 30_000; // 30 s buffer
}
