import { exec } from "node:child_process";

/** Opens a URL in the default system browser. Never throws — logs to stderr on failure. */
export function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) process.stderr.write(`[crix/auth] could not open browser: ${err.message}\n`);
  });
}
